export class BackgroundSettings {
    constructor(urlParams) {
        this.bgOpacity = parseInt(urlParams.get('bgOpacity') || '50') / 100;
        this.bgImageSize = parseInt(urlParams.get('bgImageSize') || '100');
        this.bgColor = urlParams.get('bgColor')?.replace("%23", "#") || '#ffffff';
        this.bgImagePosition = {
            x: parseInt(urlParams.get('bgImagePosX') || '50'),
            y: parseInt(urlParams.get('bgImagePosY') || '50')
        };
        this.isColoringBookImage = urlParams.get('isColoringBookImage') === 'true';
        this.bgImage = urlParams.get('bgImage');

        this.baseBgColor = this.bgColor;
    }
}