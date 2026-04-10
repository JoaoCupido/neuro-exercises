export class GridSettings {
    constructor(urlParams) {
        this.gridEnabled = urlParams.get('gridEnabled') === 'true';
        this.gridColor = urlParams.get('gridColor')?.replace("%23", "#") || '#cccccc';
        this.gridOpacity = parseInt(urlParams.get('gridOpacity') || '30') / 100;
        this.gridStyle = urlParams.get('gridStyle') || 'solid';
        this.gridCellSize = parseInt(urlParams.get('gridSize') || '20');
    }
}
