import { ImageWrapper } from '@ericblade/quagga2';
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library';
import { ScanFormat } from '../../enums/ScanFormat.enum';

// From https://github.com/mistressofjellyfish/quagga2-reader-datamatrix/blob/master/src/index.ts
class DataMatrixReader {
  // TODO: is FORMAT, _row, config, supplements actually necessary? check inside quagga to see if
  // they are used for anything? or if they are just customary.
  FORMAT: {
    value: ScanFormat.DATA_MATRIX;
    writeable: false;
  };

  _row: [];

  config: {};

  supplements: any;

  reader: MultiFormatReader;

  constructor(config: {}, supplements: any) {
    this._row = [];
    this.config = config || {};
    this.supplements = supplements;
    this.FORMAT = {
      value: ScanFormat.DATA_MATRIX,
      writeable: false,
    };

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.DATA_MATRIX]);

    this.reader = new MultiFormatReader();
    this.reader.setHints(hints);

    return this;
  }

  decodeImage(inputImageWrapper: ImageWrapper) {
    const data = inputImageWrapper.getAsRGBA();
    const lSource = new RGBLuminanceSource(
      data,
      inputImageWrapper.size.x,
      inputImageWrapper.size.y
    );
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(lSource));

    try {
      const result = this.reader.decode(binaryBitmap);

      return {
        codeResult: {
          code: result.getText(),
          format: this.FORMAT.value,
          decodedCodes: [],
        },
        // TODO: line: this.calcLine(result.location),
        ...result,
      };
    } catch (e) {
      return null;
    }
  }

  decodePattern(pattern: any) {
    // STUB, this is probably meaningless to QR, but needs to be implemented for Quagga, in case
    // it thinks there's a potential barcode in the image
    return null;
  }
}

export default DataMatrixReader;
