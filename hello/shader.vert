        // an attribute will receive data from a buffer
        attribute vec2 a_position;
        uniform vec2 u_resolution;

        vec4 positionToClip() {
            // vec2 normalizedPosition = a_position / u_resolution;
            vec2 normalizedPosition = a_position;
            vec2 clipSpacePosition = (normalizedPosition * 2.0) - 1.;
            return vec4(clipSpacePosition.x,clipSpacePosition.y, 0, 1);
        }

  void main() {
    gl_Position = positionToClip();
  }