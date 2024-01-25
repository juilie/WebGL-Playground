// fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision"
precision mediump float;
varying vec4 v_color;
varying vec2 v_UVs;
uniform float u_time;

// params:
// p: arbitrary point in 3D space
// c: the center of our sphere
// r: the radius of our sphere
  // Rotation matrix around the X axis.
mat3 rotateX(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(1, 0, 0),
        vec3(0, c, -s),
        vec3(0, s, c)
    );
}

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

// Rotation matrix around the Z axis.
mat3 rotateZ(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(c, -s, 0),
        vec3(s, c, 0),
        vec3(0, 0, 1)
    );
}

// Identity matrix.
mat3 identity() {
    return mat3(
        vec3(1, 0, 0),
        vec3(0, 1, 0),
        vec3(0, 0, 1)
    );
}

float distance_from_sphere(in vec3 p, in vec3 c, float r) {
  return length(p - c) - r;
}

float dot2(vec2 mat) {
  return dot(mat, mat);
}

float sdCappedCone( vec3 p, float h, float r1, float r2 ) {
  vec2 q = vec2( length(p.xz), p.y );
  vec2 k1 = vec2(r2,h);
  vec2 k2 = vec2(r2-r1,2.0*h);
  vec2 ca = vec2(q.x-min(q.x,(q.y<0.0)?r1:r2), abs(q.y)-h);
  vec2 cb = q - k1 + k2*clamp( dot(k1-q,k2)/dot2(k2), 0.0, 1.0 );
  float s = (cb.x<0.0 && ca.y<0.0) ? -1.0 : 1.0;
  return s*sqrt( min(dot2(ca),dot2(cb)) );
}

float sdOctahedron( vec3 p, float s )
{
  p = abs(p);
  float m = p.x+p.y+p.z-s;
  vec3 q;
       if( 3.0*p.x < m ) q = p.xyz;
  else if( 3.0*p.y < m ) q = p.yzx;
  else if( 3.0*p.z < m ) q = p.zxy;
  else return m*0.57735027;
    
  float k = clamp(0.5*(q.z-q.y+s),0.0,s); 
  return length(vec3(q.x,q.y-s+k,q.z-k)); 
}

float opSmoothUnion( float d1, float d2, float k )
{
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}

float opSmoothSubtraction( float d1, float d2, float k )
{
    float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
    return mix( d2, -d1, h ) + k*h*(1.0-h);
}

float sdVesicaSegment( in vec3 p, in vec3 a, in vec3 b, in float w )
{
    vec3  c = (a+b)*0.5;
    float l = length(b-a);
    vec3  v = (b-a)/l;
    float y = dot(p-c,v);
    vec2  q = vec2(length(p-c-y*v),abs(y));
    
    float r = 0.5*l;
    float d = 0.5*(r*r-w*w)/w;
    vec3  h = (r*q.x<d*(q.y-r)) ? vec3(0.0,r,0.0) : vec3(-d,0.0,d+w);
 
    return length(q-h.xy) - h.z;
}

float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdLink( vec3 p, float le, float r1, float r2 )
{
  vec3 q = vec3( p.x, max(abs(p.y)-le,0.0), p.z );
  return length(vec2(length(q.xy)-r1,q.z)) - r2;
}

float sdCutHollowSphere( vec3 p, float r, float h, float t )
{
  // sampling independent computations (only depend on shape)
  float w = sqrt(r*r-h*h);
  
  // sampling dependant computations
  vec2 q = vec2( length(p.xz), p.y );
  return ((h*q.x<w*q.y) ? length(q-vec2(w,h)) : 
                          abs(length(q)-r) ) - t;
}

float worldMap(in vec3 p) {
  mat3 rotZ = rotateZ(1.57);
  mat3 rotY = rotateY(u_time);

  float displacement = sin(5.0 * p.x + u_time*2.) * sin(5.0 * p.y + u_time) * sin(5.0 * p.z) * 0.25;

  float head = distance_from_sphere(p, vec3(0.0,1.5,0.), .5) + displacement;
  float body = sdCappedCone(p, 1.,1.,0.3);

  float leftArm = sdBox(vec3(p.x+1.35, p.yz), vec3(.6,0.2,0.1));
  float rightArm = sdBox(vec3(p.x-1.35, p.yz), vec3(.6,0.2,0.1));

  // float leftHand = distance_from_sphere(p, vec3(-2.8,.03,0.), .35);
  // float rightHand = distance_from_sphere(p, vec3(2.8,.03,0.), .35);
  float leftHand = sdCutHollowSphere(vec3(p.x+.4, p.y,p.z+.4), .2,.3,.1) +displacement;
  float rightHand = sdCutHollowSphere(vec3(p.x-.4, p.y,p.z+.4), .2,.3,.1) - displacement/2.;
  // float rightHand = sdCutHollowSphere(vec3(p.x-3., p.yz), .2,.3,.1);

  
  float leftLeg = sdLink(vec3(p.x+1.3, p.y+1.7, p.z), .7,.12,.2);
  float rightLeg = sdLink(vec3(p.x-1.3, p.y+1.7, p.z), .7,.12,.2);
  float tongue = sdLink(vec3(p.x, p.y+1.7, p.z), .5,.12,.5);
  float middleLeg = sdLink(vec3(p.x, p.y+2.4, p.z) * rotZ, 1.2,.12,.2);

  float hover = sdOctahedron(vec3(p.x,p.y-3.,p.z) * rotY, .5);
 
  // return min(head + displacement, body+displacement*0.3);
  // return min(opSmoothUnion(head + displacement, body+displacement*0.3, 0.5), leftArm);
  return min(hover, min(middleLeg, opSmoothUnion(tongue,opSmoothSubtraction(rightHand,opSmoothSubtraction(leftHand,opSmoothUnion(opSmoothUnion(opSmoothUnion
  (opSmoothUnion(body,opSmoothUnion(head, leftArm, 0.5),0.5), rightArm, .5), rightLeg, .5), leftLeg, 0.5),0.1),0.1),.5)));
  // return body;
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

      vec3 light_position = vec3(1.0, -4.0, 10.0);
      vec3 direction_to_light = normalize(current_position - light_position);
      float diffuse_intensity = max(0.0, dot(normal, direction_to_light));

      float cool = step(0.584, v_UVs.y);
        // We hit something! Return red for now
      
      // if(cool > 0.) {
        // return vec3(-1.0, distance_to_closest*10., 1.0 -2.) * -diffuse_intensity;
        // return vec3(.1, distance_to_closest*10., .1) * -diffuse_intensity;
      // }

      vec3 color = vec3(0.5373, 0.4118, 0.9961) * diffuse_intensity;
      color.g = v_UVs.y + color.g/2.;
      return color;
      // return vec3(1.0, distance_to_closest*10., 1.0) * -diffuse_intensity;
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