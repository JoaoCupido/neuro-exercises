export class TMTSettings {
    constructor(urlParams) {
        this.trailLength = parseInt(urlParams.get('trailLength') || '10');
        this.numberRadius = parseInt(urlParams.get('numberRadius') || '30');
        this.textSize = parseInt(urlParams.get('textSize') || '18');
        this.symbolType = urlParams.get('symbolType') || 'numbers';
        this.reverseOrder = urlParams.get('reverseOrder') === 'true';
        this.showTimer = urlParams.get('showTimer') !== 'false';

        // Advanced settings
        this.linesUnderDots = urlParams.get('linesUnderDots') !== 'false';
        this.allowWrongSelections = urlParams.get('allowWrongSelections') === 'true';
        this.showWrongSelections = urlParams.get('showWrongSelections') !== 'false';
        this.hidePopupButtons = urlParams.get('hidePopupButtons') === 'true';
        this.hidePopupResults = urlParams.get('hidePopupResults') === 'true';
        this.hidePopupAll = urlParams.get('hidePopupAll') === 'true';

        // Custom positions
        this.customPositions = this.parseCustomPositions(urlParams.get('customPositions'));
    }

    parseCustomPositions(customPositionsString) {
        if (!customPositionsString) return null;

        try {
            const decodedString = decodeURIComponent(customPositionsString);
            const positions = JSON.parse(decodedString);
            if (!Array.isArray(positions)) return null;

            const isValid = positions.every(pos =>
                pos &&
                typeof pos.x === 'number' &&
                typeof pos.y === 'number' &&
                pos.x >= 0 &&
                pos.y >= 0 &&
                pos.x <= 100 &&
                pos.y <= 100
            );

            return isValid ? positions : null;
        } catch (error) {
            console.error('Error parsing custom positions:', error);
            return null;
        }
    }
}