import { ImageWrapper } from '@ericblade/quagga2';
import jsQR from 'jsqr';
import { ScanFormat } from '../../enums/ScanFormat.enum';

// From https://github.com/ericblade/quagga2-reader-qr/blob/master/src/index.ts
class QrCodeReader {
  // TODO: is FORMAT, _row, config, supplements actually necessary? check inside quagga to see if
  // they are used for anything? or if they are just customary.
  FORMAT: {
    value: ScanFormat.QR_CODE;
    writeable: false;
  };

  _row: [];

  config;

  supplements;

  constructor(config, supplements) {
    this._row = [];
    this.config = config || {};
    this.supplements = supplements;
    this.FORMAT = {
      value: ScanFormat.QR_CODE,
      writeable: false,
    };
    return this;
  }

  decodeImage(inputImageWrapper: ImageWrapper) {
    const data = inputImageWrapper.getAsRGBA();
    const result = jsQR(
      data,
      inputImageWrapper.size.x,
      inputImageWrapper.size.y
    );

    if (result) {
      return Object.assign(
        {
          codeResult: {
            code: result.data,
            format: this.FORMAT.value,
            decodedCodes: [],
          },
        },
        result
      );
    }

    return null;
  }

  decodePattern() {
    // STUB, this is probably meaningless to QR, but needs to be implemented for Quagga, in case
    // it thinks there's a potential barcode in the image
    return null;
  }
}

export default QrCodeReader;
