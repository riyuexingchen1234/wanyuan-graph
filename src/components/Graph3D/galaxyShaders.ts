/**
 * 3D 星云节点发光点 Shader
 *
 * 使用加性混合（AdditiveBlending）让重叠点产生发光叠加感。
 * 顶点着色器根据距离自适应点大小，并加入轻微闪烁；
 * 片元着色器绘制带柔化光晕的圆形点（discard 矩形角点）。
 *
 * 注：按要求 GLSL 字符串独立于此文件导出，供 <shaderMaterial> 使用。
 */

export const galaxyPointVertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;

  varying vec3 vColor;

  uniform float uTime;
  uniform float uPixelRatio;

  void main() {
    vColor = aColor;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = -mvPosition.z;

    // 闪烁：每个点用自身位置作相位，避免整体同步
    float twinkle = 0.82 + 0.18 * sin(
      uTime * 1.6 + position.x * 0.6 + position.y * 0.4 + position.z * 0.5
    );

    // 距离自适应点大小（像素）
    gl_PointSize = aSize * uPixelRatio * twinkle * (300.0 / max(dist, 1.0));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const galaxyPointFragmentShader = /* glsl */ `
  varying vec3 vColor;

  void main() {
    // gl_PointCoord: 0~1 的点内坐标，中心为 (0.5, 0.5)
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);

    // 圆形裁剪
    if (d > 0.5) discard;

    // 实心核心 + 柔化光晕（halo 收紧，避免近距离过度发光吞没其他节点）
    float core = smoothstep(0.5, 0.0, d);
    float halo = smoothstep(0.5, 0.32, d);

    float alpha = core * 0.95 + halo * 0.22;
    vec3 col = vColor * (0.85 + core * 1.0);

    gl_FragColor = vec4(col, alpha);
  }
`;
