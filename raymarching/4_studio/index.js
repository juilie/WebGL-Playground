var canvas = document.querySelector("#hello");
var gl = canvas.getContext("webgl");
let program;
// num.toFixed() creates string with decimals
let sdfObjects = [{
  sdf: "sdSphere",
  position: [0.,0.,0.],
  radius: 1.0
}]

let rotate = false;

function fragTemplate(objects) {
  return`
  // fragment shaders don't have a default precision so we need
  // to pick one. mediump is a good default. It means "medium precision"
  precision mediump float;
  varying vec4 v_color;
  varying vec2 v_UVs;
  uniform float u_time;
  uniform float u_rotate;
  
  // Rotation matrix around the Y axis.
mat3 rotateY(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(c, 0, s),
        vec3(0, 1, 0),
        vec3(-s, 0, c)
    );
}

  // params:
  // p: arbitrary point in 3D space
  // c: the center of our sphere
  // r: the radius of our sphere
  float sdSphere(in vec3 p, in vec3 c, float r) {
    return length(p - c) - r;
  }
    
  float opSmoothUnion( float d1, float d2, float k )
  {
      float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
      return mix( d2, d1, h ) - k*h*(1.0-h);
  }
  
  float worldMap(in vec3 p) {
    mat3 rotation = rotateY(u_time * u_rotate);
    float displacement = sin(5.0 * p.x + u_time) * sin(5.0 * p.y) * sin(5.0 * p.z) * 0.25;
    //float sphere_0 = distance_from_sphere(p, vec3(0.0), 1.0);
    //float sphere_1 = distance_from_sphere(p, vec3(1.,0.,0.), 1.);

    //return min(sphere_0, sphere_1);
    ${writeFragString(objects)}
  }
  
  vec3 calculate_normal(in vec3 p) {
    const vec3 small_step = vec3(0.001, 0.0, 0.0);
  
    float gradient_x = worldMap(p + small_step.xyy) - worldMap(p - small_step.xyy);
    float gradient_y = worldMap(p + small_step.yxy) - worldMap(p - small_step.yxy);
    float gradient_z = worldMap(p + small_step.yyx) - worldMap(p - small_step.yyx);
  
    vec3 normal = vec3(gradient_x, gradient_y, gradient_z);
  
    return normalize(normal);
  }
  
  // tetrahedron technique (more efficient, only 4)
  vec3 calcNormal( in vec3 p ) // for function f(p)
  {
      const float h = 0.0001; // replace by an appropriate value
      const vec2 k = vec2(1,-1);
      return normalize( k.xyy*worldMap( p + k.xyy*h ) + 
                        k.yyx*worldMap( p + k.yyx*h ) + 
                        k.yxy*worldMap( p + k.yxy*h ) + 
                        k.xxx*worldMap( p + k.xxx*h ) );
  }
  
  
  vec3 ray_march(in vec3 ray_origin, in vec3 ray_direction) {
    float total_distance_traveled = 0.0;
    const int NUMBER_OF_STEPS = 32;
    const float MINIMUM_HIT_DISTANCE = 0.001;
    const float MAXIMUM_TRACE_DISTANCE = 1000.0;
  
    for(int i = 0; i < NUMBER_OF_STEPS; ++i) {
  
          // Calculate our current position along the ray
      vec3 current_position = ray_origin + total_distance_traveled * ray_direction;
  
          // We wrote this function earlier in the tutorial -
          // assume that the sphere is centered at the origin
          // and has unit radius
      float distance_to_closest = worldMap(current_position);
  
      if(distance_to_closest < MINIMUM_HIT_DISTANCE) // hit
      {
        vec3 normal = calcNormal(current_position);
  
            // For now, hard-code the light's position in our scene
        vec3 light_position = vec3(1.0, -4.0, 10.0);
  
            // Calculate the unit direction vector that points from
            // the point of intersection to the light source
        vec3 direction_to_light = normalize(current_position - light_position);
  
        float diffuse_intensity = max(0.0, dot(normal, direction_to_light));
  
          // We hit something! Return red for now
        return vec3(1.0, 0.,1.) * diffuse_intensity;
  
      }
  
      if(total_distance_traveled > MAXIMUM_TRACE_DISTANCE) // miss
      {
        break;
      }
  
          // accumulate the distance traveled thus far
      total_distance_traveled += distance_to_closest;
    }
  
      // If we get here, we didn't hit anything so just
      // return a background color (black)
    return vec3(0.0);
  }
  
  void main() {
      // gl_FragColor is a special variable a fragment shader
      // is responsible for setting
    vec2 st = v_UVs;
  
        // Remap the space to -1. to 1.
    vec2 uv = st * 2. - 1.;
  
    vec3 camera_position = vec3(0.0, 0.0, -5.0);
    vec3 ro = camera_position;
    vec3 rd = vec3(uv, 1.0);
  
    vec3 color = ray_march(ro, rd);
  
      // Visualize the distance field
    gl_FragColor = vec4(color, 1.);
  }
  `
  
} 
let meltiness = 0.5;

function writeFragString(sdfObjects){
  let objString = "";
  let renderString=""
  sdfObjects.forEach((obj, i) => {
    
    objString += `
    float ${obj.sdf}${i} = ${obj.sdf}(p * rotation, vec3(${obj.position[0].toFixed(4)}, ${obj.position[1].toFixed(4)}, ${obj.position[2].toFixed(4)}), ${obj.radius.toFixed(4)});
    `;

    if (renderString != "") {
      renderString = `opSmoothUnion(${obj.sdf}${i}, ${renderString}, ${meltiness})`
    } else {
      renderString += `${obj.sdf}${i}`
    }
  })

  return `${objString}
  return ${renderString};`
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
    program = gl.createProgram();
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

async function createProgramFromFiles(filenames) {
    var vertexShaderSource = await fetch(filenames[0]).then(r => r.text());
    // var fragmentShaderSource = await fetch(filenames[1]).then(r => r.text());
    var fragmentShaderSource = fragTemplate(sdfObjects);

    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    var program = createProgram(gl, vertexShader, fragmentShader);

    return program;
}

function randomInt(range) {
    return Math.floor(Math.random() * range);
}

async function main() {

    var program = await createProgramFromFiles(['shader.vert', 'shader.frag']);

    // look up where the vertex data needs to go.
    var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    var colorAttributeLocation = gl.getAttribLocation(program, "a_color");

    // look up uniform locations
    var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
    var timeUniformLocation = gl.getUniformLocation(program, "u_time");
    var rotateUniformLocation = gl.getUniformLocation(program, "u_rotate");

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(timeUniformLocation, performance.now());
    gl.uniform1f(rotateUniformLocation, 0.0);

    gl.enableVertexAttribArray(positionAttributeLocation);

    var positionBuffer = gl.createBuffer();
    let positions = [];

    // Bind the position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2; // 2 components per iteration
    var type = gl.FLOAT; // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0; // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionAttributeLocation, size, type, normalize, stride, offset)


    positions = [
        0., 0.,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 0.0,
        0.0, 1.0,
        1.0, 1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    let colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    
    size = 4;
    type = gl.UNSIGNED_BYTE;
    normalize = true;
    stride = 0;
    offset = 0;
    gl.vertexAttribPointer(
        colorAttributeLocation, size, type, normalize, stride, offset
        );
        
        let colors = new Uint8Array([
            255, 255, 0, 255,
            255, 0, 255, 255,
            0, 255, 255, 255,
            255, 255, 0, 255,
            255, 0, 255, 255,
            0, 255, 255, 255,
        ])
        
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(colorAttributeLocation);
        
        
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);

    function renderLoop(timeStamp) { 

      // set time uniform
      gl.uniform1f(timeUniformLocation, timeStamp/1000.0);
      gl.drawArrays(primitiveType, offset, count);
      // recursive invocation
      window.requestAnimationFrame(renderLoop);
    }
    
    // start the loop
    window.requestAnimationFrame(renderLoop);
}

document.addEventListener("DOMContentLoaded", main)

canvas.addEventListener("click", (e) => {
  let normMouseX = (e.clientX / canvas.width) * 4. - 2.;
  let normMouseY = ((canvas.height - e.clientY) / canvas.height) * 4. - 2.;
  
  sdfObjects.push({
    sdf: "sdSphere",
    position: [normMouseX, normMouseY, 0.],
    radius: 1.0
  }) 

  console.log(sdfObjects);
  console.log(e.clientX, e.clientY);
// window.cancelAnimationFrame();

  main();
})

document.addEventListener("keydown", (e) => {
  console.log(e.key);
    if (e.key === "r") {
      console.log("ghello");
      rotate = !rotate;
      let rotateUniformLocation = gl.getUniformLocation(program, "u_rotate");
      gl.uniform1f(rotateUniformLocation, rotate ? 1.0 : 0.0);
    }
})