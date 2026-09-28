import { type MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { CarbineModel, type OperatorMotion, type OperatorRig } from './game-models';
import { createOperatorCutout, OPERATOR_SHEET_URL } from './operator-texture';

type Vec3 = [number, number, number];

function SheetVolume({
  position,
  restX,
  restY,
  radii,
  front,
  back,
}: {
  position: Vec3;
  restX: number;
  restY: number;
  radii: Vec3;
  front: THREE.Material;
  back: THREE.Material;
}) {
  const [frontGeometry, backGeometry] = useMemo(() => {
    // Front hemispheres receive a planar projection of the supplied full-body skin.
    // The back hemispheres complete the volume with colors sampled from its palette.
    const face = new THREE.SphereGeometry(1, 24, 16, 0, Math.PI);
    const rear = new THREE.SphereGeometry(1, 24, 16, Math.PI, Math.PI);
    const vertices = face.getAttribute('position');
    const uv = face.getAttribute('uv');
    for (let i = 0; i < vertices.count; i += 1) {
      const x = restX + vertices.getX(i) * radii[0];
      const y = restY + vertices.getY(i) * radii[1];
      uv.setXY(
        i,
        THREE.MathUtils.clamp((x + .54) / 1.08, .001, .999),
        THREE.MathUtils.clamp(y / 1.86, .001, .999),
      );
    }
    uv.needsUpdate = true;
    return [face, rear];
  }, [restX, restY, radii[0], radii[1]]);

  useEffect(() => () => {
    frontGeometry.dispose();
    backGeometry.dispose();
  }, [frontGeometry, backGeometry]);

  return (
    <group position={position}>
      <mesh geometry={frontGeometry} material={front} scale={radii} castShadow receiveShadow />
      <mesh geometry={backGeometry} material={back} scale={radii} castShadow receiveShadow />
    </group>
  );
}

function sampleSwatch(image: HTMLImageElement, x: number, y: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not sample the operator texture palette.');
  context.drawImage(image, Math.floor(image.naturalWidth * x), Math.floor(image.naturalHeight * y), 1, 1, 0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return new THREE.Color(`rgb(${red}, ${green}, ${blue})`);
}

function fillCutout(cutout: HTMLCanvasElement, color: THREE.Color) {
  const canvas = document.createElement('canvas');
  canvas.width = cutout.width;
  canvas.height = cutout.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare the operator model texture.');
  context.drawImage(cutout, 0, 0);
  context.globalCompositeOperation = 'destination-over';
  context.fillStyle = `#${color.getHexString(THREE.SRGBColorSpace)}`;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function OperatorCharacter3D({
  rootRef,
  rigRef,
  motionRef,
}: {
  rootRef: MutableRefObject<THREE.Group | null>;
  rigRef: MutableRefObject<OperatorRig>;
  motionRef: MutableRefObject<OperatorMotion>;
}) {
  const torsoRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const sheet = useLoader(THREE.TextureLoader, OPERATOR_SHEET_URL);

  const materials = useMemo(() => {
    const image = sheet.image as HTMLImageElement;
    const suitColor = sampleSwatch(image, .4, .09);
    const skinColor = sampleSwatch(image, .4, .225);
    const hairColor = sampleSwatch(image, .54, .225);
    const shirtColor = sampleSwatch(image, .54, .09);
    const pantsColor = suitColor.clone().multiplyScalar(.76);
    const shoeColor = new THREE.Color('#3c302b');
    const cutout = createOperatorCutout(image);
    const maps = {
      suit: fillCutout(cutout, suitColor),
      pants: fillCutout(cutout, pantsColor),
      skin: fillCutout(cutout, skinColor),
      shoes: fillCutout(cutout, shoeColor),
    };
    return {
      maps,
      frontSuit: new THREE.MeshStandardMaterial({ map: maps.suit, roughness: .83 }),
      frontPants: new THREE.MeshStandardMaterial({ map: maps.pants, roughness: .88 }),
      frontSkin: new THREE.MeshStandardMaterial({ map: maps.skin, roughness: .83 }),
      frontShoes: new THREE.MeshStandardMaterial({ map: maps.shoes, roughness: .8 }),
      suit: new THREE.MeshStandardMaterial({ color: suitColor, roughness: .88 }),
      pants: new THREE.MeshStandardMaterial({ color: pantsColor, roughness: .93 }),
      skin: new THREE.MeshStandardMaterial({ color: skinColor, roughness: .83 }),
      hair: new THREE.MeshStandardMaterial({ color: hairColor, roughness: .96 }),
      shirt: new THREE.MeshStandardMaterial({ color: shirtColor, roughness: .88 }),
      shoes: new THREE.MeshStandardMaterial({ color: shoeColor, roughness: .8 }),
      glasses: new THREE.MeshStandardMaterial({ color: '#20252b', metalness: .2, roughness: .5 }),
    };
  }, [sheet]);

  useEffect(() => () => {
    Object.values(materials.maps).forEach((map) => map.dispose());
    materials.frontSuit.dispose();
    materials.frontPants.dispose();
    materials.frontSkin.dispose();
    materials.frontShoes.dispose();
    materials.suit.dispose();
    materials.pants.dispose();
    materials.skin.dispose();
    materials.hair.dispose();
    materials.shirt.dispose();
    materials.shoes.dispose();
    materials.glasses.dispose();
  }, [materials]);

  useFrame(() => {
    const rig = rigRef.current;
    rig.torso = torsoRef.current;
    rig.hips = hipsRef.current;
    rig.leftArm = leftArmRef.current;
    rig.rightArm = rightArmRef.current;
    rig.leftLeg = leftLegRef.current;
    rig.rightLeg = rightLegRef.current;

    const motion = motionRef.current;
    const stride = Math.min(1, motion.speed);
    const swing = Math.sin(motion.time * 10.5);
    if (hipsRef.current) hipsRef.current.position.y = .78 + Math.abs(swing) * .018 * stride;
    if (torsoRef.current) {
      torsoRef.current.position.y = .83 + Math.abs(swing) * .018 * stride;
      torsoRef.current.rotation.z = -.025 * swing * stride;
      torsoRef.current.rotation.x = motion.damagePulse * .06 - motion.firePulse * .025;
    }
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing * .42 * stride;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing * .42 * stride;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * .28 * stride - motion.firePulse * .1;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing * .28 * stride - motion.firePulse * .18;
  });

  return (
    <group ref={rootRef} dispose={null}>
      <mesh position={[0, .035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[.46, 28]} />
        <meshBasicMaterial color="#03080b" transparent opacity={.32} depthWrite={false} />
      </mesh>
      <mesh position={[0, .04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[.39, .44, 32]} />
        <meshBasicMaterial color="#48d9f5" transparent opacity={.54} side={THREE.DoubleSide} />
      </mesh>

      <group ref={hipsRef} position={[0, .78, 0]}>
        <SheetVolume position={[0, 0, 0]} restX={0} restY={.78} radii={[.31, .18, .23]} front={materials.frontPants} back={materials.pants} />
      </group>

      <group ref={leftLegRef} position={[-.18, .73, 0]}>
        <SheetVolume position={[0, -.29, 0]} restX={-.18} restY={.44} radii={[.15, .3, .18]} front={materials.frontPants} back={materials.pants} />
        <SheetVolume position={[-.02, -.64, .12]} restX={-.2} restY={.09} radii={[.2, .09, .25]} front={materials.frontShoes} back={materials.shoes} />
      </group>
      <group ref={rightLegRef} position={[.18, .73, 0]}>
        <SheetVolume position={[0, -.29, 0]} restX={.18} restY={.44} radii={[.15, .3, .18]} front={materials.frontPants} back={materials.pants} />
        <SheetVolume position={[.02, -.64, .12]} restX={.2} restY={.09} radii={[.2, .09, .25]} front={materials.frontShoes} back={materials.shoes} />
      </group>

      <group ref={torsoRef} position={[0, .83, 0]}>
        <SheetVolume position={[0, .35, 0]} restX={0} restY={1.18} radii={[.39, .41, .28]} front={materials.frontSuit} back={materials.suit} />
        <mesh position={[0, .67, 0]} material={materials.skin} castShadow>
          <cylinderGeometry args={[.09, .11, .15, 14]} />
        </mesh>
        <SheetVolume position={[0, .81, .01]} restX={0} restY={1.64} radii={[.2, .21, .18]} front={materials.frontSkin} back={materials.skin} />
        <mesh position={[0, .98, -.018]} scale={[.205, .08, .175]} material={materials.hair} castShadow>
          <sphereGeometry args={[1, 18, 12]} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * .195, .79, 0]} scale={[.038, .065, .042]} material={materials.skin} castShadow>
              <sphereGeometry args={[1, 12, 8]} />
            </mesh>
            <mesh position={[side * .073, .82, .173]} material={materials.glasses}>
              <torusGeometry args={[.059, .008, 6, 18]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, .82, .181]} rotation={[0, 0, Math.PI / 2]} material={materials.glasses}>
          <cylinderGeometry args={[.007, .007, .045, 8]} />
        </mesh>

        <group ref={leftArmRef} position={[-.33, .58, 0]} rotation={[0, 0, -.07]}>
          <SheetVolume position={[-.075, -.26, 0]} restX={-.405} restY={1.15} radii={[.14, .29, .16]} front={materials.frontSuit} back={materials.suit} />
          <SheetVolume position={[-.12, -.57, .005]} restX={-.45} restY={.84} radii={[.086, .11, .092]} front={materials.frontSkin} back={materials.skin} />
        </group>
        <group ref={rightArmRef} position={[.33, .58, 0]} rotation={[0, 0, .07]}>
          <SheetVolume position={[.075, -.26, 0]} restX={.405} restY={1.15} radii={[.14, .29, .16]} front={materials.frontSuit} back={materials.suit} />
          <SheetVolume position={[.12, -.57, .005]} restX={.45} restY={.84} radii={[.086, .11, .092]} front={materials.frontSkin} back={materials.skin} />
        </group>
        <group position={[.17, -.04, .13]}>
          <CarbineModel rigRef={rigRef} motionRef={motionRef} scale={.84} />
        </group>
      </group>
    </group>
  );
}