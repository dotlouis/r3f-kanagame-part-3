import { useKeyboardControls, Edges } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, vec3 } from "@react-three/rapier";
import { useEffect, useRef } from "react";
import { Controls } from "../App";
import { gameStates, playAudio, useGameStore, useSelectStore } from "../store";
import Character from "./Character";

import * as THREE from "three";

const JUMP_FORCE = 0.5;
const MOVEMENT_SPEED = 0.1;
const MAX_VEL = 3;
const RUN_VEL = 1.5;

export const CharacterController = ({ id }) => {
  const { characterState, setCharacterState, gameState } = useGameStore(
    (state) => ({
      character: state.characterState,
      setCharacterState: state.setCharacterState,
      gameState: state.gameState,
    }),
  );
  // const jumpPressed = useKeyboardControls((state) => state[Controls.jump]);
  // const leftPressed = useKeyboardControls((state) => state[Controls.left]);
  // const rightPressed = useKeyboardControls((state) => state[Controls.right]);
  // const backPressed = useKeyboardControls((state) => state[Controls.back]);
  // const forwardPressed = useKeyboardControls(
  //   (state) => state[Controls.forward],
  // );
  const rigidbody = useRef();
  const isOnFloor = useRef(true);

  useFrame((state, delta) => {
    const impulse = { x: 0, y: 0, z: 0 };
    // if (jumpPressed && isOnFloor.current) {
    //   impulse.y += JUMP_FORCE;
    //   isOnFloor.current = false;
    // }

    const linvel = rigidbody.current.linvel();
    let changeRotation = false;
    // if (rightPressed && linvel.x < MAX_VEL) {
    //   impulse.x += MOVEMENT_SPEED;
    //   changeRotation = true;
    // }
    // if (leftPressed && linvel.x > -MAX_VEL) {
    //   impulse.x -= MOVEMENT_SPEED;
    //   changeRotation = true;
    // }
    // if (backPressed && linvel.z < MAX_VEL) {
    //   impulse.z += MOVEMENT_SPEED;
    //   changeRotation = true;
    // }
    // if (forwardPressed && linvel.z > -MAX_VEL) {
    //   impulse.z -= MOVEMENT_SPEED;
    //   changeRotation = true;
    // }

    rigidbody.current.applyImpulse(impulse, true);

    if (Math.abs(linvel.x) > RUN_VEL || Math.abs(linvel.z) > RUN_VEL) {
      if (characterState !== "Run") {
        setCharacterState("Run");
      }
    } else {
      if (characterState !== "Idle") {
        setCharacterState("Idle");
      }
    }

    if (changeRotation) {
      const angle = Math.atan2(linvel.x, linvel.z);
      character.current.rotation.y = angle;
    }

    // CAMERA FOLLOW
    const characterWorldPosition = character.current.getWorldPosition(
      new THREE.Vector3(),
    );

    const targetCameraPosition = new THREE.Vector3(
      characterWorldPosition.x + 0,
      0,
      characterWorldPosition.z + 6,
    );

    if (gameState === gameStates.GAME) {
      targetCameraPosition.y = 14;
    }
    if (gameState !== gameStates.GAME) {
      targetCameraPosition.y = 20;
    }

    state.camera.position.lerp(targetCameraPosition, delta * 2);

    const targetLookAt = new THREE.Vector3(
      characterWorldPosition.x,
      0,
      characterWorldPosition.z + 0,
    );

    const direction = new THREE.Vector3();
    state.camera.getWorldDirection(direction);

    const position = new THREE.Vector3();
    state.camera.getWorldPosition(position);

    const currentLookAt = position.clone().add(direction);
    const lerpedLookAt = new THREE.Vector3();

    lerpedLookAt.lerpVectors(currentLookAt, targetLookAt, delta * 2);

    state.camera.lookAt(lerpedLookAt);
  });

  const character = useRef();

  const resetPosition = () => {
    rigidbody.current.setTranslation(vec3({ x: 0, y: 0, z: 0 }));
    rigidbody.current.setLinvel(vec3({ x: 0, y: 0, z: 0 }));
  };

  useEffect(
    () => useGameStore.subscribe((state) => state.currentStage, resetPosition),
    [],
  );

  useEffect(
    () => useGameStore.subscribe((state) => state.wrongAnswers, resetPosition),
    [],
  );

  const { selection, popMoveQueue } = useSelectStore((state) => ({
    selection: state.selection,
    popMoveQueue: state.popMoveQueue,
  }));

  useEffect(
    () =>
      useSelectStore.subscribe(
        (state) => state.moveQueue,
        (state) => {
          console.log({ moveQueue: state });
          if (state.length > 0) {
            rigidbody.current.setTranslation(vec3(state[0].point));
            popMoveQueue();
          }
        },
      ),
    [],
  );

  useEffect(() => {
    console.log({ selection });
  }, [selection]);

  const isSelected = !!selection.find((x) => x?.userData?.id == id);

  return (
    <group>
      <RigidBody
        ref={rigidbody}
        colliders={false}
        scale={[0.5, 0.5, 0.5]}
        enabledRotations={[false, false, false]}
        onCollisionEnter={() => {
          isOnFloor.current = true;
        }}
        onIntersectionEnter={({ other }) => {
          if (other.rigidBodyObject.name === "void") {
            resetPosition();
            playAudio("fall", () => {
              playAudio("ganbatte");
            });
          }
        }}
      >
        <CapsuleCollider args={[0.8, 0.4]} position={[0, 1.2, 0]} />
        <group ref={character}>
          <Character id={id} />
          <Edges
            visible={isSelected}
            scale={1.1}
            renderOrder={1000}
            geometry={new THREE.BoxGeometry()}
          >
            <meshBasicMaterial transparent color="#333" depthTest={false} />
          </Edges>
        </group>
      </RigidBody>
    </group>
  );
};
