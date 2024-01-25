    // fragment shaders don't have a default precision so we need
    // to pick one. mediump is a good default. It means "medium precision"
    precision mediump float;
    varying vec4 v_color;
    varying vec2 v_UVs;

    // params:
// p: arbitrary point in 3D space
// c: the center of our sphere
// r: the radius of our sphere
float distance_from_sphere(in vec3 p, in vec3 c, float r)
{
	return length(p - c) - r;
}

// params:
// p: arbitrary point in 3D space
// c: the center of our sphere
// r: the radius of our sphere
float distance_from_sphere(in vec2 p, in vec2 c, float r)
{
	return length(p - c) - r;
}

     
  void main() {
    // gl_FragColor is a special variable a fragment shader
    // is responsible for setting
      vec2 st = v_UVs;

      // Remap the space to -1. to 1.
      st = st *2.-1.;

      vec3 color = vec3(distance_from_sphere(st, vec2(0.5,0.5), 0.25));
    

    // Visualize the distance field
    gl_FragColor = vec4(color, 1.);
    // gl_FragColor = vec4(vec3(v_UVs.x), 1.0);
  }