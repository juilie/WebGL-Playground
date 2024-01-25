    // fragment shaders don't have a default precision so we need
    // to pick one. mediump is a good default. It means "medium precision"
    precision mediump float;
    varying vec4 v_color;
    varying vec2 v_UVs;
     
    void main() {
      // gl_FragColor is a special variable a fragment shader
      // is responsible for setting



      // vec4 color_filter = v_color * vec4(1.,0.,1.,1.);

      gl_FragColor = vec4(v_UVs.x, 0., 0., 1.);
    }