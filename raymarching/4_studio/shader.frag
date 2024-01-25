// fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision"
precision mediump float;
varying vec4 v_color;
varying vec2 v_UVs;

// params:
// p: arbitrary point in 3D space
// c: the center of our sphere
// r: the radius of our sphere
float distance_from_sphere(in vec3 p, in vec3 c, float r) {
  return length(p - c) - r;
}

float worldMap(in vec3 p) {
  float displacement = sin(5.0 * p.x) * sin(5.0 * p.y) * sin(5.0 * p.z) * 0.25;
  float sphere_0 = distance_from_sphere(p, vec3(0.0), 1.0);
  float sphere_1 = distance_from_sphere(p, vec3(1.,0.,0.), 1.);
  return min(sphere_0, sphere_1);
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
      return vec3(1.0, 0.,0.) * diffuse_intensity;

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