export function createAthlete({ THREE, scene, mat, color, isAI = false }) {
  const group = new THREE.Group();
  const bodyRoot = new THREE.Group();
  group.add(bodyRoot);

  const shirt = mat(color, 0.31, 0.08);
  const shirtDark = mat(isAI ? 0xb53e35 : 0x8eae24, 0.36, 0.06);
  const trim = mat(0xf4f8f9, 0.25, 0.05);
  const shorts = mat(isAI ? 0x171c20 : 0xf1f4f5, 0.4, 0.04);
  const skin = mat(isAI ? 0xae7254 : 0xc98c69, 0.66, 0.01);
  const skinShade = mat(isAI ? 0x915b44 : 0xa96f52, 0.72, 0.01);
  const hairMat = mat(isAI ? 0x211a17 : 0x171a1b, 0.48, 0.03);
  const dark = mat(0x111719, 0.34, 0.14);
  const sole = mat(0xe9eff1, 0.3, 0.03);
  const shoeAccent = mat(isAI ? 0xff654f : 0xc8ff34, 0.34, 0.06);
  const eyeWhite = mat(0xf7fbff, 0.18, 0.0);
  const iris = mat(isAI ? 0x4b3326 : 0x355b62, 0.24, 0.02);

  const shadow = (mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const torso = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.7, 10, 22), shirt));
  torso.position.y = 1.22;
  torso.scale.set(1.02, 1, 0.86);
  bodyRoot.add(torso);

  const chestPanel = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.37, 0.035), shirtDark));
  chestPanel.position.set(0, 1.28, 0.257);
  chestPanel.rotation.x = -0.04;
  bodyRoot.add(chestPanel);

  const collar = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.018, 10, 24, Math.PI), trim));
  collar.rotation.x = Math.PI / 2;
  collar.rotation.z = Math.PI;
  collar.position.set(0, 1.58, 0.23);
  bodyRoot.add(collar);

  const shoulderStripe = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.052, 0.31), trim));
  shoulderStripe.position.set(0, 1.48, 0.035);
  bodyRoot.add(shoulderStripe);

  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.047, 18), new THREE.MeshBasicMaterial({ color: isAI ? 0xffffff : 0x162004 }));
  logo.position.set(0.12, 1.34, 0.279);
  bodyRoot.add(logo);

  const hips = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.27, 0.18, 24), shorts));
  hips.position.y = 0.82;
  bodyRoot.add(hips);

  const shortsLeft = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.25, 0.28), shorts));
  shortsLeft.position.set(-0.125, 0.69, 0);
  bodyRoot.add(shortsLeft);
  const shortsRight = shortsLeft.clone();
  shortsRight.position.x = 0.125;
  bodyRoot.add(shortsRight);

  const neck = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.077, 0.09, 0.16, 16), skin));
  neck.position.y = 1.69;
  bodyRoot.add(neck);

  const headPivot = new THREE.Group();
  headPivot.position.y = 1.89;
  bodyRoot.add(headPivot);

  const cranium = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.205, 30, 22), skin));
  cranium.scale.set(0.91, 1.04, 0.96);
  headPivot.add(cranium);

  const jaw = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.165, 24, 18), skinShade));
  jaw.position.set(0, -0.095, 0.018);
  jaw.scale.set(0.9, 0.63, 0.86);
  headPivot.add(jaw);

  for (const earX of [-0.19, 0.19]) {
    const ear = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 10), skin));
    ear.position.set(earX, -0.005, 0);
    ear.scale.set(0.55, 1, 0.42);
    headPivot.add(ear);
  }

  const nose = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.027, 0.07, 10), skinShade));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.015, 0.196);
  headPivot.add(nose);

  for (const eyeX of [-0.058, 0.058]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.017, 14, 10), eyeWhite);
    eye.position.set(eyeX, 0.026, 0.179);
    eye.scale.set(1, 0.72, 0.45);
    headPivot.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), iris);
    pupil.position.set(eyeX, 0.026, 0.192);
    pupil.scale.set(1, 0.9, 0.45);
    headPivot.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.011, 0.012), hairMat);
    brow.position.set(eyeX, 0.069, 0.177);
    brow.rotation.z = eyeX < 0 ? 0.08 : -0.08;
    headPivot.add(brow);
  }

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.012, 0.012), mat(0x63372f, 0.64, 0));
  mouth.position.set(0, -0.097, 0.179);
  headPivot.add(mouth);

  const hairCap = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.21, 30, 20, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat));
  hairCap.position.y = 0.072;
  hairCap.scale.set(0.96, 0.82, 1.02);
  headPivot.add(hairCap);

  const hairFront = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.055, 0.07), hairMat));
  hairFront.position.set(0, 0.105, 0.158);
  hairFront.rotation.x = -0.22;
  headPivot.add(hairFront);

  if (isAI) {
    const beard = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.17, 22, 14, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.5), hairMat));
    beard.position.set(0, -0.075, 0.012);
    beard.scale.set(0.86, 0.72, 0.9);
    headPivot.add(beard);
  }

  const legAnchors = [];
  for (const [index, x] of [-0.14, 0.14].entries()) {
    const upperPivot = new THREE.Group();
    upperPivot.position.set(x, 0.72, 0);
    bodyRoot.add(upperPivot);

    const upper = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.31, 7, 12), skin));
    upper.position.y = -0.17;
    upperPivot.add(upper);

    const knee = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.092, 16, 12), skinShade));
    knee.position.y = -0.39;
    upperPivot.add(knee);

    const lowerPivot = new THREE.Group();
    lowerPivot.position.y = -0.39;
    upperPivot.add(lowerPivot);

    const lower = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.29, 7, 11), skin));
    lower.position.y = -0.16;
    lowerPivot.add(lower);

    const sock = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.078, 0.13, 14), trim));
    sock.position.y = -0.32;
    lowerPivot.add(sock);

    const shoe = new THREE.Group();
    shoe.position.set(0, -0.39, 0.055);
    lowerPivot.add(shoe);
    const shoeBody = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.085, 0.27), dark));
    shoeBody.position.set(0, 0.045, 0.05);
    shoe.add(shoeBody);
    const toe = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10), dark));
    toe.position.set(0, 0.04, 0.165);
    toe.scale.set(0.9, 0.55, 1.2);
    shoe.add(toe);
    const outsole = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.022, 0.31), sole));
    outsole.position.set(0, -0.004, 0.07);
    shoe.add(outsole);
    const shoeStripe = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.052, 0.2), shoeAccent));
    shoeStripe.position.set(index === 0 ? -0.082 : 0.082, 0.052, 0.065);
    shoe.add(shoeStripe);

    legAnchors.push({ upper: upperPivot, lower: lowerPivot, shoe });
  }

  const arms = [];
  const forearms = [];
  const armBaseZ = [];
  for (const [index, side] of [-1, 1].entries()) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.325, 1.45, 0);
    shoulder.rotation.z = side * -0.23;
    armBaseZ.push(shoulder.rotation.z);
    bodyRoot.add(shoulder);

    const sleeve = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.16, 6, 11), shirt));
    sleeve.position.y = -0.08;
    shoulder.add(sleeve);

    const upperArm = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.25, 6, 11), skin));
    upperArm.position.y = -0.25;
    shoulder.add(upperArm);

    const elbow = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 10), skinShade));
    elbow.position.y = -0.42;
    shoulder.add(elbow);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.y = -0.42;
    shoulder.add(forearmPivot);

    const forearm = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.24, 6, 10), skin));
    forearm.position.y = -0.14;
    forearmPivot.add(forearm);

    const wristBand = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.07, 12), index === 1 ? shoeAccent : trim));
    wristBand.position.y = -0.29;
    forearmPivot.add(wristBand);

    const hand = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), skin));
    hand.position.y = -0.35;
    hand.scale.set(0.82, 1.05, 0.74);
    forearmPivot.add(hand);

    arms.push(shoulder);
    forearms.push(forearmPivot);
  }

  const racket = new THREE.Group();
  const grip = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.45, 14), trim));
  grip.rotation.z = Math.PI / 2;
  grip.position.x = 0.18;
  racket.add(grip);

  const gripBands = mat(isAI ? 0x321510 : 0x28320f, 0.55, 0.02);
  for (let i = 0; i < 5; i += 1) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.0415, 0.006, 7, 18), gripBands);
    band.rotation.y = Math.PI / 2;
    band.position.x = 0.02 + i * 0.075;
    racket.add(band);
  }

  const throat = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.075, 0.052), dark));
  throat.position.x = 0.34;
  racket.add(throat);

  const racketFaceMat = mat(isAI ? 0xff654f : 0xc8ff34, 0.28, 0.16);
  const face = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.052, 46), racketFaceMat));
  face.rotation.z = Math.PI / 2;
  face.position.x = 0.52;
  face.scale.y = 1.18;
  racket.add(face);

  const rim = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.249, 0.024, 16, 48), dark));
  rim.rotation.y = Math.PI / 2;
  rim.scale.y = 1.18;
  rim.position.x = 0.52;
  racket.add(rim);

  const bridge = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.19, 0.06), dark));
  bridge.position.set(0.39, -0.19, 0);
  racket.add(bridge);

  const holeMat = new THREE.MeshBasicMaterial({ color: 0x091013 });
  for (let y = -0.14; y <= 0.14; y += 0.056) {
    for (let z = -0.13; z <= 0.13; z += 0.054) {
      if (y * y + z * z < 0.029) {
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.011, 9), holeMat);
        hole.rotation.y = Math.PI / 2;
        hole.position.set(0.548, y, z);
        racket.add(hole);
      }
    }
  }

  const racketLogo = new THREE.Mesh(new THREE.CircleGeometry(0.055, 20), new THREE.MeshBasicMaterial({ color: isAI ? 0xffdfd9 : 0x1c2607 }));
  racketLogo.rotation.y = Math.PI / 2;
  racketLogo.position.set(0.55, 0, 0.002);
  racket.add(racketLogo);

  racket.position.set(0.36, 1.08, 0.02);
  bodyRoot.add(racket);

  group.userData.racket = racket;
  group.userData.bodyRoot = bodyRoot;
  group.userData.head = headPivot;
  group.userData.legs = [legAnchors[0].upper, legAnchors[1].upper];
  group.userData.legAnchors = legAnchors;
  group.userData.arms = arms;
  group.userData.forearms = forearms;
  group.userData.armBaseZ = armBaseZ;
  scene.add(group);
  return group;
}
