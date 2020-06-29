let rgba = module.exports
rgba.rgba = (r, g, b, a) => [r, g, b, a ? a : 255];
rgba.redLevel = (rgbaColor) => rgbaColor[0];
rgba.greenLevel = (rgbaColor) => rgbaColor[1];
rgba.blueLevel = (rgbaColor) => rgbaColor[2];
rgba.averageChannelLevel =  (r, g, b) => (r + g + b) / 3;

//Was originally creating a class with methods to calculate various properties of the color in that colorspace,
// then I learned RGBA is a model and not a color space. Multiple colorspaces can be modelled as RGBA.
// class RGBA {
//     constructor(r=0, g=0, b=0, a=255) {
//         this.r = r;
//         this.g = g;
//         this.b = b;
//         this.a = a;
//     }
//     //The subjective intensity of physical light of this color
//     relativeLuminence() {
        
//     }
//     //The subjective intensity of a gamma-compressed video signal (sRGB color space)
//     // luma() {
//     //     return 0.299 *  this.r + 0.587 * this.g + 0.114 * this.b;
//     // }
//     tone() {
//         return (Math.max(this.r, this.g, this.b) + Math.min(this.r, this.g, this.b)) / 2;
//     }
//     averageLevel() {
//         return (this.r + this.g + this.b) / 3;
//     }
// }
