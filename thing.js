class SquareMapChart {
    create(classicalWorld, squaredWorld) {
        this.width = 960;
        this.height = 500;
        this.margin = {top: 0, left: 0, right: 0, bottom: 0}
        this.world = classicalWorld;
        this.worldTile = squaredWorld;
        this.svg = d3.select(DOM.svg(
            this.width - (this.margin.left + this.margin.right),
            this.height - (this.margin.top + this.margin.bottom)
        ));
        this.main = this.svg.append('g')
            .attr('class', 'main')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        this.map = this.main.append('g')
            .attr('class', 'map');

        this.labels = this.main.append('g')
            .attr('class', 'labels');
    }
    update(state) {
        this.valueAccessor = state.valueAccessor;
        this.countryCodeType = state.countryCodeType;
        this.countryCodeAccessor = state.countryCodeAccessor;
        if(state.data && JSON.stringify(this.data) !== JSON.stringify(state.data)) {
            this._drawMap(state.data);
        }
        if(state.view && this.view !== state.view){
            if(state.view === 'classic'){
                this.switchToClassic();
            } else {
                this.switchToSquares();
            }
        }
        this.data = state.data;
        this.view = state.view;
        return this.svg.node();
    }
    _drawMap(data) {
        const dataDomain = d3.extent(data, d => d[this.valueAccessor]);
        const dataMapping = data.reduce( (agg, v) => {
            var country;
            if(this.countryCodeType === 'name'){
                country = this.worldTile.find( d => d.name === v[this.countryCodeAccessor])
            }
            if(country) agg[country.alpha2] = v[this.valueAccessor];
            return agg;
        }, {});
        var colorScale = d3.scaleSequential()
            .domain([dataDomain[1], dataDomain[0]])
            .interpolator(d3.interpolateGnBu);
        // create a first guess for the projection
        var projection = d3.geoMercator()
            .scale(1)
            .translate([0, 0]);
        // create the path
        var path = d3.geoPath()
            .projection(projection);
        // using the path determine the bounds of the current map and use
        // these to determine better values for the scale and translation
        var bounds = path.bounds(this.world);
        var scale = .95 / Math.max(
            (bounds[1][0] - bounds[0][0]) / this.width,
            (bounds[1][1] - bounds[0][1]) / this.height
        );
        var xGridDomain = d3.extent(this.worldTile, d => d.x);
        var yGridDomain = d3.extent(this.worldTile, d => d.y);
        var xWidth = this.width/(xGridDomain[1] - xGridDomain[0]);
        var yWidth = this.height/(yGridDomain[1] - yGridDomain[0]);
        var squareWidth = Math.min(xWidth, yWidth);
        var xOffset = (this.width - ((xGridDomain[1] - xGridDomain[0])*squareWidth))/2;
        var yOffset = (this.height - ((yGridDomain[1] - yGridDomain[0])*squareWidth))/2;
        var squarePosition = this.worldTile.reduce( (agg, v) => {
            agg[v.alpha2] = {
                x: (v.x * squareWidth) + xOffset,
                y: (v.y * squareWidth) + yOffset
            }
            return agg;
        }, {})
        var offset  = [
            (this.width - scale * (bounds[1][0] + bounds[0][0])) / 2,
            (this.height - scale * (bounds[1][1] + bounds[0][1])) / 2
        ];
        // new projection
        projection = d3.geoMercator()
            .scale(scale)
            .translate(offset);
        path = path.projection(projection);
        this.squarePosition = squarePosition;
        this.squareWidth = squareWidth;
        this.path = path;
        this.map
            .selectAll('path')
            .data(this.world.features)
            .enter().append('path')
            .attr('d', path)
            .style('fill', d => dataMapping[d.properties.iso_a2] !== undefined ?
                colorScale(dataMapping[d.properties.iso_a2]) : '#F0F0F0')
            .style('stroke', 'gray')
            .style('stroke-width', 1);
        this.labels
            .selectAll('text')
            .data(this.world.features)
            .enter().append('text')
            .text( d => d.properties.iso_a2 )
            .attr('x', d => this.squarePosition[d.properties.iso_a2].x + (this.squareWidth/2) )
            .attr('y', d => this.squarePosition[d.properties.iso_a2].y + (this.squareWidth/2) )
            .style('fill', 'black')
            .style('alignment-baseline', 'central')
            .style('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('font-family', 'Helvetica, Arial, sans-serif')
            .style('opacity', 0);
    }
    switchToSquares(){
        this.map
            .selectAll('path')
            .transition()
            .duration(3000)
            .attrTween('d', d => {
                if(this.squarePosition[d.properties.iso_a2]){
                    var x = this.squarePosition[d.properties.iso_a2].x;
                    var y = this.squarePosition[d.properties.iso_a2].y;
                    if(d.geometry.type === 'MultiPolygon'){
                        var square = [[x,y], [x+this.squareWidth,y], [x+this.squareWidth,y+this.squareWidth], [x,y+this.squareWidth], [x,y]];
                        var filteredPolygons = d.geometry.coordinates.map( coordinates => this.path({type: 'Polygon', coordinates: coordinates}));
                        return flubber.combine(filteredPolygons, square, { single: true });
                    } else {
                        return flubber.toRect(this.path(d), x, y, this.squareWidth, this.squareWidth, { maxSegmentLength: 10 });
                    }
                } else {
                    console.log('Unmatched country ' + d.properties.iso_a2);
                    return null;
                }
            })
            .transition()
            .duration(0)
            .attr('d', d => {
                if(this.squarePosition[d.properties.iso_a2]){
                    var x = this.squarePosition[d.properties.iso_a2].x;
                    var y = this.squarePosition[d.properties.iso_a2].y;
                    var square = [[x,y], [x+this.squareWidth,y], [x+this.squareWidth,y+this.squareWidth], [x,y+this.squareWidth], [x,y]];
                    return flubber.toPathString(square);
                }
            });

        this.labels
            .selectAll('text')
            .transition()
            .duration(1000)
            .delay(2000)
            .style('opacity', 1);
    }
    switchToClassic(){
        this.map
            .selectAll('path')
            .transition()
            .duration(3000)
            .attrTween('d', d => {
                if(this.squarePosition[d.properties.iso_a2]){
                    var x = this.squarePosition[d.properties.iso_a2].x;
                    var y = this.squarePosition[d.properties.iso_a2].y;
                    if(d.geometry.type === 'MultiPolygon'){
                        var square = [[x,y], [x+this.squareWidth,y], [x+this.squareWidth,y+this.squareWidth], [x,y+this.squareWidth], [x,y]];
                        var filteredPolygons = d.geometry.coordinates.map( coordinates => this.path({type: 'Polygon', coordinates: coordinates}));
                        return flubber.separate(square, filteredPolygons, { single: true });
                    } else {
                        return flubber.fromRect(x, y, this.squareWidth, this.squareWidth, this.path(d), { maxSegmentLength: 10 });
                    }
                } else {
                    console.log('Unmatched country ' + d.properties.iso_a2);
                    return null;
                }
            });

        this.labels
            .selectAll('text')
            .transition()
            .duration(300)
            .style('opacity', 0);
    }
}