import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import * as twgl from 'twgl.js/dist/5.x/twgl-full.js'

function resizeCanvasToDisplaySize(canvas) {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Check if the canvas is not the same size.
    const needResize = canvas.width  !== displayWidth ||
                    canvas.height !== displayHeight;

    if (needResize) {
    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
    }

    return needResize;
}

function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}


function main() {
    
    var canvas = document.querySelector("#canvas");

    /**@type {WebGLRenderingContext} */
    const gl = canvas.getContext("webgl");
    if(!gl) {
        const warning = WebGL.getWebGLErrorMessage();
        document.body.appendChild(warning);
    }

    
    // Specify the viewport size to convert from clip space [-1, 1] to canvas pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Create shader
    var vsSource = document.querySelector("#vertex-shader-2d").text;
    var fsSource = document.querySelector("#fragment-shader-2d").text;
    const programInfo = twgl.createProgramInfo(gl,[vsSource, fsSource]);


    // Create buffers

    const arrays ={
        a_Position: {numComponents: 2, data:[
            -0.5, -1,
            0.5, -1,
            0.5, 1,
            -0.5, 1]},
        a_GridID: {numComponents: 2, data: [0, 0, 10, 0, 10, 20, 0, 20]},
        indices: {numComponents: 3, data: [0, 1, 2, 2, 3, 0]}
    };

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    var gridDataTex = gl.createTexture();
    var gridData = new Uint8Array(200 * 3);
    gridData[0] = 160;
    gridData[1] = 32;
    gridData[2] = 240;
    gridData[4] = 200;
    gl.bindTexture(gl.TEXTURE_2D, gridDataTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 10, 20, 0, gl.RGB, gl.UNSIGNED_BYTE, gridData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


    // Render code
    function render(time) {
        // Resize canvas if it changes
        twgl.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gridData[0] = (Math.sin(time * 0.001) * 0.5 + 0.5) * 255;
        gridData[1] = (Math.cos(time * 0.001) * 0.5 + 0.5) * 255;
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 10, 20, gl.RGB, gl.UNSIGNED_BYTE, gridData);
        // Create uniform list
        const uniforms = {
            u_Time: time * 0.001,
            u_Resolution: [gl.canvas.width, gl.canvas.height],
            u_GridData: gridDataTex,
        };
    
        gl.useProgram(programInfo.program); // Bind the shader program
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);  // Enable/create the attribute pointers
        twgl.setUniforms(programInfo, uniforms);    // Set the shader uniforms
        twgl.drawBufferInfo(gl, bufferInfo);    // Call the appropriate draw function
    
        requestAnimationFrame(render);  // Request the next frame
    }

    requestAnimationFrame(render);  // Request the first frame
    

    // Clear the canvas
    //gl.clearColor(0, 0, 0, 0);
    //gl.clear(gl.COLOR_BUFFER_BIT);

}



main();