import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import Quagga, {
  QuaggaJSConfigObject,
  QuaggaJSResultObject,
} from '@ericblade/quagga2';
import defaultsDeep from 'lodash.defaultsdeep';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { mapToReader } from '../helper';
import DataMatrixReader from '../readers/DataMatrixReader';
import QrCodeReader from '../readers/QrCodeReader';
import { DEFAULT_CONFIG } from './barcode-scanner-livestream.config';

@Component({
  selector: 'barcode-scanner-livestream',
  templateUrl: './barcode-scanner-livestream.component.html',
  styleUrls: ['./barcode-scanner-livestream.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BarcodeScannerLivestreamComponent implements OnChanges, OnDestroy {
  // Inputs
  @Input() type: string | string[];

  @Input() deviceId: string;

  @Input() maxWidth = '100%';

  @Input() maxHeight: string;

  @Input() config: Partial<QuaggaJSConfigObject>;

  @Input() errorFilter: {
    median?: number;
    threshold?: number;
  };

  _valueChanges = new Subject();

  // Outputs
  @Output() valueChanges = new EventEmitter<QuaggaJSResultObject>();

  @Output() started = new EventEmitter<boolean>();

  @ViewChild('BarcodeScanner') barcodeScanner: ElementRef<HTMLDivElement>;

  get _maxWidth(): string {
    return this.maxWidth ? `${this.maxWidth}` : 'auto';
  }

  get _maxHeight(): string {
    return this.maxHeight ? `${this.maxHeight}` : 'auto';
  }

  private _started = false;

  get isStarted(): boolean {
    return this._started;
  }

  private _destroyed: Subject<boolean> = new Subject<boolean>();

  private configQuagga: QuaggaJSConfigObject;

  constructor() {
    this._valueChanges
      .pipe(
        takeUntil(this._destroyed),
        filter((result: QuaggaJSResultObject) => {
          const errors: number[] = result.codeResult.decodedCodes
            .filter((_) => _.error !== undefined)
            .map((_) => _.error);

          const median = this._getMedian(errors);

          //Filter result when median and/or threshold parameters are provided
          //Good result for code_128 : median = 0.08 and threshold = 0.1
          return (
            !this.errorFilter ||
            !(
              (this.errorFilter.median && median > this.errorFilter.median) ||
              (this.errorFilter.threshold &&
                errors.some((err) => err > this.errorFilter.threshold))
            )
          );
        })
      )
      .subscribe((result) => {
        this.valueChanges.next(result);
      });
  }

  ngOnDestroy(): void {
    this.stop();
    this._destroyed.next(true);
    this._destroyed.complete();
  }

  ngOnChanges(): void {
    this.restart();
  }

  private _init(): Promise<void> {
    return new Promise((resolve, reject) => {
      Quagga.onDetected((result) => this.onDetected(result));

      // External Readers
      Quagga.registerReader('qr_code_reader', QrCodeReader);
      Quagga.registerReader('datamatrix_reader', DataMatrixReader);

      this.configQuagga = defaultsDeep({}, this.config, DEFAULT_CONFIG);

      this.configQuagga.inputStream.target = this.barcodeScanner.nativeElement;

      if (this.type) {
        this.configQuagga.decoder.readers = mapToReader(this.type);
      }

      if (this.deviceId) {
        this.configQuagga.inputStream.constraints.deviceId = this.deviceId;
      }

      Quagga.init(this.configQuagga, (err) => {
        if (err) {
          console.log(err);
          return reject(err);
        }

        resolve();
      });
    });
  }

  private _getMedian(arr: number[]): number {
    arr.sort((a, b) => a - b);
    const half = Math.floor(arr.length / 2);
    if (arr.length % 2 === 1)
      // Odd length
      return arr[half];
    return (arr[half - 1] + arr[half]) / 2.0;
  }

  async start(): Promise<void> {
    if (!this._started) {
      await this._init();
      Quagga.start();
      this.drawRedLine();
      this._started = true;
      this.started.next(true);
    }
  }

  drawRedLine() {
    const drawingCtx = Quagga.canvas.ctx.overlay;
    const width = Quagga.canvas.dom.image.width;
    const height = Quagga.canvas.dom.image.height;
    const xOffset = 50;

    Quagga.ImageDebug.drawPath(
      [
        { x: xOffset, y: height / 2 },
        { x: width - xOffset, y: height / 2 },
      ],
      {
        x: 'x',
        y: 'y',
      },
      drawingCtx,
      {
        color: 'red',
        lineWidth: 3,
      }
    );
  }

  stop(): void {
    if (this._started) {
      Quagga.stop();
      this._started = false;
      this.started.next(false);
    }
  }

  restart(): void {
    if (this._started) {
      this.stop();
      this.start();
    }
  }

  onDetected(result: QuaggaJSResultObject): void {
    this._valueChanges.next(result);
  }
}
