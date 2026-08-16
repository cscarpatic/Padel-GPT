export function createAthlete({ THREE, scene, mat, color, isAI = false }) {
  const group = new THREE.Group();
  const shirt = mat(color, 0.34, 0.08);
  const trim = mat(0xf2f7f8, 0.28, 0.06);
  const shorts = mat(isAI ? 0x22282c : 0xf2f5f6, 0.42, 0.03);
  const skin = mat(isAI ? 0xb87d5e : 0xca9270, 0.72);
  const dark = mat(0x101719, 0.4, 0.12);
  const sole = mat(0xe8f0f2, 0.3, 0.04);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.29, 0.72, 8, 18), shirt);
  torso.position.y = 1.19;
  torso.scale.set(1, 1, 0.88);
  torso.castShadow = true;
  group.add(torso);

  const shoulderBand = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.055, 0.29), trim);
  shoulderBand.position.set(0, 1.48, 0.08);
  shoulderBand.castShadow = true;
  group.add(shoulderBand);

  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.265, 0.16, 20), shorts);
  waist.position.y = 0.81;
  waist.castShadow = true;
  group.add(waist);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.15, 14), skin);
  neck.position.y = 1.67;
  neck.castShadow = true;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.198, 26, 20), skin);
  head.position.y = 1.88;
  head.scale.set(0.92, 1.06, 0.98);
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.202, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.56), dark);
  hair.position.y = 1.96;
  hair.scale.set(0.96, 0.78, 1.01);
  hair.castShadow = true;
  group.add(hair);

  for (const eyeX of [-0.052, 0.052]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), mat(0xf7fbff, 0.2));
    eye.position.set(eyeX, 1.895, 0.178);
    group.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), dark);
    pupil.position.set(eyeX, 1.893, 0.19);
    group.add(pupil);
  }

  const legAnchors = [];
  for (const x of [-0.14, 0.14]) {
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.29, 6, 10), shorts);
    upper.position.set(x, 0.61, 0);
    upper.castShadow = true;
    group.add(upper);

    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.29, 6, 10), skin);
    lower.position.set(x, 0.31, 0.01);
    lower.castShadow = true;
    group.add(lower);

    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.073, 0.073, 0.095, 12), trim);
    sock.position.set(x, 0.14, 0.02);
    sock.castShadow = true;
    group.add(sock);

    const shoe = new THREE.Group();
    const upperShoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.065, 0.25), dark);
    upperShoe.position.set(0, 0.075, 0.05);
    upperShoe.castShadow = true;
    const outsole = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.02, 0.26), sole);
    outsole.position.set(0, 0.04, 0.05);
    outsole.castShadow = true;
    shoe.add(upperShoe, outsole);
    shoe.position.set(x, 0.025, 0.04);
    group.add(shoe);
    legAnchors.push({ upper, lower, shoe });
  }

  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.49, 6, 10), skin);
  leftArm.position.set(-0.29, 1.22, 0);
  leftArm.rotation.z = 0.48;
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.3;
  rightArm.rotation.z = -0.55;
  group.add(rightArm);

  const racket = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.041, 0.44, 12), trim);
  grip.rotation.z = Math.PI / 2;
  grip.position.x = 0.18;
  grip.castShadow = true;
  racket.add(grip);

  const handleCore = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.41, 10), dark);
  handleCore.rotation.z = Math.PI / 2;
  handleCore.position.x = 0.18;
  racket.add(handleCore);

  const throat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.05), dark);
  throat.position.x = 0.32;
  racket.add(throat);

  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.05, 38), mat(isAI ? 0xff735d : 0xd7ff43, 0.3, 0.14));
  face.rotation.z = Math.PI / 2;
  face.position.x = 0.5;
  face.scale.y = 1.18;
  face.castShadow = true;
  racket.add(face);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.242, 0.023, 14, 40), dark);
  rim.rotation.y = Math.PI / 2;
  rim.scale.y = 1.17;
  rim.position.x = 0.5;
  racket.add(rim);

  const holeMat = new THREE.MeshBasicMaterial({ color: 0x091013 });
  for (let y = -0.13; y <= 0.13; y += 0.062) {
    for (let z = -0.12; z <= 0.12; z += 0.058) {
      if (y * y + z * z < 0.026) {
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.0115, 8), holeMat);
        hole.rotation.y = Math.PI / 2;
        hole.position.set(0.526, y, z);
        racket.add(hole);
      }
    }
  }

  racket.position.set(0.36, 1.1, 0.02);
  group.add(racket);

  group.userData.racket = racket;
  group.userData.legs = [legAnchors[0].upper, legAnchors[1].upper];
  group.userData.legAnchors = legAnchors;
  group.userData.arms = [leftArm, rightArm];
  scene.add(group);
  return group;
}
