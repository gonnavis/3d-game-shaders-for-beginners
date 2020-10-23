#version 300 es
precision highp float;
precision highp int;
precision lowp sampler2DShadow;
/*
  (C) 2019 David Lettier
  lettier.com
*/

uniform mat4 lensProjection;

uniform sampler2D beautyTexture;
uniform sampler2D positionTexture;
uniform sampler2D normalTexture;
// uniform sampler2D maskTexture;

// uniform vec2 enabled;

// in vec2 texCoord;

out vec4 fragColor;

void main() {
  // fragColor=vec4(1,1,0,1);return;

  float maxDistance = 8.;
  float resolution  = 0.3;
  int   steps       = 5;
  float thickness   = 0.5;

  vec2 texSize  = vec2(textureSize(positionTexture, 0).xy);

  vec2 texCoord = gl_FragCoord.xy / texSize;

	// fragColor=texture(positionTexture, texCoord);return;
	// vec4 vertexPosition=texture(positionTexture, texCoord);
  // fragColor=vec4(vertexPosition.xy*.05,-vertexPosition.z*.01,1);return;

	// fragColor=texture(normalTexture, texCoord);return;

  vec4 uv = vec4(0.0);

  vec4 positionFrom = texture(positionTexture, texCoord);
  // vec4 mask         = texture(maskTexture,     texCoord);

  if (  positionFrom.w <= 0.0
    //  || enabled.x      != 1.0
    //  || mask.r         <= 0.0
     ) { fragColor = uv; return; }

  vec3 unitPositionFrom = normalize(positionFrom.xyz);
  // fragColor=vec4(unitPositionFrom*vec3(1,1,-.2),1);return;
  vec3 normal           = normalize(texture(normalTexture, texCoord).xyz);
  // fragColor=vec4(normal,1);return;
  vec3 pivot            = normalize(reflect(unitPositionFrom, normal));
  // fragColor=vec4(pivot,1);return;

  vec4 positionTo = positionFrom;

  vec4 startView = vec4(positionFrom.xyz + (pivot *         0.0), 1.0);
  vec4 endView   = vec4(positionFrom.xyz + (pivot * maxDistance), 1.0);

  vec4 startFrag      = startView;
       startFrag      = lensProjection * startFrag;
       startFrag.xyz /= startFrag.w;
       startFrag.xy   = startFrag.xy * 0.5 + 0.5;
       startFrag.xy  *= texSize;
  // fragColor=vec4((startFrag/947.).xy,0,1);return;

  vec4 endFrag      = endView;
       endFrag      = lensProjection * endFrag;
       endFrag.xyz /= endFrag.w;
       endFrag.xy   = endFrag.xy * 0.5 + 0.5;
       endFrag.xy  *= texSize;
  // fragColor=vec4((endFrag/947.).xy,0,1);return;

  vec2 frag  = startFrag.xy;
       uv.xy = frag / texSize;

  float deltaX    = endFrag.x - startFrag.x;
  float deltaY    = endFrag.y - startFrag.y;
  float useX      = abs(deltaX) >= abs(deltaY) ? 1.0 : 0.0;
  float delta     = mix(abs(deltaY), abs(deltaX), useX) * clamp(resolution, 0.0, 1.0);
  vec2  increment = vec2(deltaX, deltaY) / max(delta, 0.001);

  float search0 = 0.;
  float search1 = 0.;

  int hit0 = 0;
  int hit1 = 0;

  float viewDistance = -startView.z;
  float depth        = thickness;

  int i = 0;

  // fragColor=vec4(delta/947.*10.,0,0,1);return;

  for (i = 0; i < int(delta); ++i) {
    frag      += increment;
    uv.xy      = frag / texSize;
    positionTo = texture(positionTexture, uv.xy);

    search1 =
      mix
        ( (frag.y - startFrag.y) / deltaY
        , (frag.x - startFrag.x) / deltaX
        , useX
        );

    search1 = clamp(search1, 0.0, 1.0);

    viewDistance = (startView.z * endView.z) / mix(-endView.z, -startView.z, search1);
    depth        = viewDistance - -positionTo.z;

    if (depth > 0. && depth < thickness) {
      hit0 = 1;
      break;
    } else {
      search0 = search1;
    }
  }
  // fragColor=vec4((startView.xyz+pivot*search0)/10.,1);return;

  search1 = search0 + ((search1 - search0) / 2.0);

  // steps =0;
  steps *= hit0;

  for (i = 0; i < steps; ++i) {
    frag       = mix(startFrag.xy, endFrag.xy, search1);
    uv.xy      = frag / texSize;
    positionTo = texture(positionTexture, uv.xy);

    viewDistance = (startView.z * endView.z) / mix(-endView.z, -startView.z, search1);
    depth        = viewDistance - -positionTo.z;

    if (depth > 0. && depth < thickness) {
      hit1 = 1;
      search1 = search0 + ((search1 - search0) / 2.);
    } else {
      float temp = search1;
      search1 = search1 + ((search1 - search0) / 2.);
      search0 = temp;
    }
  }

  // fragColor=vec4((startView.xyz+pivot*search0)/10.,1);return;

  float visibility =
      float(hit1)
    * positionTo.w
    * ( 1.
      - max
         ( dot(-unitPositionFrom, pivot)
         , 0.
         )
      )
    * ( 1.
      - clamp
          ( depth / thickness
          , 0.
          , 1.
          )
      )
    * ( 1.
      - clamp
          (   length(positionTo - positionFrom)
            / maxDistance
          , 0.
          , 1.
          )
      )
    * (uv.x < 0. || uv.x > 1. ? 0. : 1.)
    * (uv.y < 0. || uv.y > 1. ? 0. : 1.);

  visibility = clamp(visibility, 0., 1.);

  uv.ba = vec2(visibility);

  // fragColor = uv;

  vec4 beautyColor=texture(beautyTexture,texCoord);
  vec4 reflectColor=texture(beautyTexture,uv.xy);

  // fragColor=reflectColor;return;

  if(visibility>0.){
    fragColor=vec4(vec3(reflectColor.xyz*.3+beautyColor.xyz*.7),1);
  }else{
    fragColor=beautyColor;
  }
}
