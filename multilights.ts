// Add your code here
namespace multilights {

    // let lightSources :Sprite[] = []

    // let lightSourceMap : {[id:number]:LightSource;} = {}

     // The top row is just the palette, each row gets darker
    const palette_ramps = image.ofBuffer(hex`e4100400ffff0000d1cb0000a2ff0000b3fc0000e4fc000045ce000086fc000067c80000c8ff000069c80000bafc0000cbff0000fcff0000bdfc0000ceff0000ffff0000`);

    let bandPalettes :Buffer[] = []

    function changeRowLightLevel(lightMap:Image, x:number, y:number, width:number, lightLevel:number) {



    }
    //
    export class MultiLightSource {
        private sprite:Sprite
        offsetTable: Buffer;
        
        private bandWidth:number
        private width:number
        private height:number

        constructor(sprite:Sprite, bandWidth:number, public rings: number, public centerRadius: number ){
            this.sprite = sprite
            this.bandWidth = bandWidth

            const halfh = centerRadius + rings * bandWidth;
            this.offsetTable = pins.createBuffer((rings + 1) * halfh);

            // Approach is roughly based on https://hackernoon.com/pico-8-lighting-part-1-thin-dark-line-8ea15d21fed7
            let x: number;
            let band: number;
            let y2: number;
            for (let y = 0; y < halfh; y++) {
                y2 = Math.pow(y, 2);
                // Store the offsets where the bands switch light levels for each row. We only need to
                // do one quadrant which we can mirror in x/y
                for (band = 0; band < rings; band++) {
                    x = Math.sqrt(Math.pow(centerRadius + bandWidth * (band + 1), 2) - y2) | 0;
                    this.offsetTable[y * rings + band] = x;
                }
            }

            this.width = halfh;
            this.height = halfh;
        }

        

        apply(lightMap:Image) {
            const camera = game.currentScene().camera;
            const halfh = this.width;
            const cx = this.sprite.x - camera.drawOffsetX;
            const cy = this.sprite.y - camera.drawOffsetY;

            let prev: number;
            let offset: number;
            let band: number;

            // Go over each row and light the colors
            for (let y = 0; y < halfh; y++) {
                band = this.rings;
                prev = 0;
                offset = this.offsetTable[y * this.rings + band - 1]

                // Darken each concentric circle by remapping the colors
                while (band > 0) {
                    offset = this.offsetTable[y * this.rings + band - 1]
                    if (offset) {
                        offset += (Math.idiv(Math.randomRange(0, 11), 5))
                    }

                    // We reflect the circle-quadrant horizontally and vertically
                    changeRowLightLevel(lightMap, cx + offset, cy + y + 1, prev - offset, 4 - band)
                    changeRowLightLevel(lightMap, cx - prev, cy + y + 1, prev - offset, 4 - band)
                    changeRowLightLevel(lightMap, cx + offset, cy - y, prev - offset, 4 - band)
                    changeRowLightLevel(lightMap, cx - prev, cy - y, prev - offset, 4 - band)

                    prev = offset;
                    band--;
                }
            }
        }
    }

    export class MultiLightScreenEffect implements effects.BackgroundEffect {

        private lightSourceMap : {[id:string]:MultiLightSource;} = {}

        private _init:boolean = false
        private running = false;
        private static instance :MultiLightScreenEffect

        public static getInstance() :MultiLightScreenEffect{
            if (MultiLightScreenEffect.instance == null) {
                MultiLightScreenEffect.instance = new MultiLightScreenEffect()
            }
            return MultiLightScreenEffect.instance
        }
        constructor() {
            this._init = false;
            bandPalettes = [];
            for (let band = 0; band < 6; band++) {
                const buffer = pins.createBuffer(16);
                for (let i = 0; i < 16; i++) {
                    buffer[i] = palette_ramps.getPixel(i, band + 1);
                }
                bandPalettes.push(buffer);
            }
        }

        stopScreenEffect() {
            this.running = false;
        }


        startScreenEffect() {
            if(this._init) {
                return
            }


            scene.createRenderable(91, () => {
                if (!this.running) {
                    return;
                } 


                // 0. prepare a empty light map with radius 0
                let lightMap = image.create(screen.width, screen.height)
                lightMap.fill(0)
                // 1. prepare light map for each light source
                for (const key of Object.keys(this.lightSourceMap)) {
                    let lightsource = this.lightSourceMap[key]
                    lightsource.apply(lightMap)
                }

                
                // 2. apply light map to screen
            })

            this._init = true
        }

        addLightSource(sprite:Sprite, bandWidth:number) {
            let newLightSource = this.lightSourceMap[sprite.id]
            if (!newLightSource) {
                newLightSource = new MultiLightSource(sprite, bandWidth, 4, 1)    
                this.lightSourceMap[sprite.id] = newLightSource
            }

            sprite.onDestroyed(function() {
                removeLightSource(sprite)      
            })
        }
    } 

    

    export function toggleLighting(on:boolean) {
        if (on) {
            MultiLightScreenEffect.getInstance().startScreenEffect()
        } else {
            MultiLightScreenEffect.getInstance().stopScreenEffect()
        }

    }


    export function bandWidthOf(sprite:Sprite, bandWidth:number) {

    }

    export function removeLightSource(sprite:Sprite) {

    }

    export function addLightSource(sprite:Sprite,bandWidth:number) {
        MultiLightScreenEffect.getInstance().addLightSource(sprite, bandWidth)
    }
}