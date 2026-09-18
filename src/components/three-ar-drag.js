/**
 * Custom A-Frame + Three.js Component: Ground Ring Drag & Drop Controls
 * Enables smooth drag along horizontal ground, hover lift animation,
 * target ring under feet, gesture locks, and position telemetry updates.
 */
import { getTHREE, createGroundTargetRing } from '../utils/three-helpers';

if (typeof AFRAME !== 'undefined' && !AFRAME.components['three-ar-drag']) {
  AFRAME.registerComponent('three-ar-drag', {
    schema: {
      enabled: { default: true },
      lerpSpeed: { default: 14.0 }, // Motion interpolation speed
      liftHeight: { default: 0.35 } // Elevation height when lifted up
    },

    init: function () {
      const THREE = getTHREE();
      this.isDragging = false;
      this.dragPlane = new THREE.Plane();
      this.planeIntersect = new THREE.Vector3();
      this.dragOffset = new THREE.Vector3();
      this.raycaster = new THREE.Raycaster();
      this.activeTouchId = null;

      // Position & Lift Animation States
      this.targetPosition = new THREE.Vector3();
      if (this.el && this.el.object3D) {
        this.targetPosition.copy(this.el.object3D.position);
      }
      this.currentHoverY = 0.0;
      this.targetHoverY = 0.0;
      this.basePosY = (this.el && this.el.object3D) ? this.el.object3D.position.y : 0.0;

      // Gesture state backups
      this.hadOneFingerRotate = false;
      this.hadTwoFingerRotate = false;
      this.hadPinchScale = false;

      // Create Ground Target Selection Ring
      const ringObj = createGroundTargetRing();
      if (ringObj) {
        this.ringGroup = ringObj.group;
        this.ringMat = ringObj.ringMat;
        this.discMat = ringObj.discMat;
      }

      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);

      const sceneEl = this.el.sceneEl;
      const bindEvents = () => {
        const canvas = sceneEl.canvas || document.body;
        // Add ground ring to 3D scene
        if (this.ringGroup && sceneEl.object3D && !sceneEl.object3D.getObjectByName('arGroundTargetRing')) {
          sceneEl.object3D.add(this.ringGroup);
        }

        canvas.addEventListener('touchstart', this.onPointerDown, { passive: false });
        canvas.addEventListener('touchmove', this.onPointerMove, { passive: false });
        canvas.addEventListener('touchend', this.onPointerUp, { passive: false });
        canvas.addEventListener('touchcancel', this.onPointerUp, { passive: false });

        canvas.addEventListener('mousedown', this.onPointerDown);
        window.addEventListener('mousemove', this.onPointerMove);
        window.addEventListener('mouseup', this.onPointerUp);
      };

      if (sceneEl.canvas) {
        bindEvents();
      } else {
        sceneEl.addEventListener('render-target-loaded', bindEvents, { once: true });
      }
    },

    play: function () {
      if (this.el && this.el.object3D) {
        this.targetPosition.copy(this.el.object3D.position);
        this.basePosY = this.el.object3D.position.y;
      }
    },

    remove: function () {
      if (this.ringGroup && this.ringGroup.parent) {
        this.ringGroup.parent.remove(this.ringGroup);
      }

      const sceneEl = this.el.sceneEl;
      const canvas = sceneEl ? (sceneEl.canvas || document.body) : document.body;

      canvas.removeEventListener('touchstart', this.onPointerDown);
      canvas.removeEventListener('touchmove', this.onPointerMove);
      canvas.removeEventListener('touchend', this.onPointerUp);
      canvas.removeEventListener('touchcancel', this.onPointerUp);

      canvas.removeEventListener('mousedown', this.onPointerDown);
      window.removeEventListener('mousemove', this.onPointerMove);
      window.removeEventListener('mouseup', this.onPointerUp);
    },

    getScreenCoords: function (e) {
      let clientX, clientY;
      if (e.touches && e.touches.length > 0) {
        if (e.touches.length > 1) return null; // Avoid drag conflicts during multi-touch pinch/rotate
        let touch = e.touches[0];
        if (this.activeTouchId !== null) {
          for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === this.activeTouchId) {
              touch = e.touches[i];
              break;
            }
          }
        }
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const canvas = this.el.sceneEl.canvas || document.body;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: -((clientY - rect.top) / rect.height) * 2 + 1
      };
    },

    checkHit: function (coords, camera) {
      const THREE = getTHREE();
      camera.updateMatrixWorld(true);
      this.raycaster.setFromCamera(coords, camera);

      // 1. Direct mesh intersection check
      const intersects = this.raycaster.intersectObject(this.el.object3D, true);
      if (intersects.length > 0) return true;

      // 2. Proximity bounding sphere check for easy grab targeting
      const boundingBox = new THREE.Box3().setFromObject(this.el.object3D);
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      const sphere = new THREE.Sphere(center, 0.8);
      const ray = this.raycaster.ray;
      if (ray.intersectsSphere(sphere)) return true;

      return false;
    },

    disableGestures: function () {
      // Pause rotate and pinch scale gestures during active drag
      this.hadOneFingerRotate = this.el.hasAttribute('xrextras-one-finger-rotate');
      this.hadTwoFingerRotate = this.el.hasAttribute('xrextras-two-finger-rotate');
      this.hadPinchScale = this.el.hasAttribute('xrextras-pinch-scale');

      if (this.hadOneFingerRotate) this.el.removeAttribute('xrextras-one-finger-rotate');
      if (this.hadTwoFingerRotate) this.el.removeAttribute('xrextras-two-finger-rotate');
      if (this.hadPinchScale) this.el.removeAttribute('xrextras-pinch-scale');
    },

    enableGestures: function () {
      // Restore rotate and pinch scale gestures after drag ends
      if (this.hadOneFingerRotate) this.el.setAttribute('xrextras-one-finger-rotate', 'factor: 6');
      if (this.hadTwoFingerRotate) this.el.setAttribute('xrextras-two-finger-rotate', 'factor: 5');
      if (this.hadPinchScale) this.el.setAttribute('xrextras-pinch-scale', 'min: 0.05; max: 20; scale: 0');
    },

    onPointerDown: function (e) {
      const THREE = getTHREE();
      if (!this.data.enabled) return;
      if (e.touches && e.touches.length > 1) {
        this.onPointerUp();
        return;
      }

      // Ignore UI overlay elements
      if (e.target && e.target.closest && e.target.closest('#mobile-ui-overlay')) return;

      const coords = this.getScreenCoords(e);
      if (!coords) return;

      const camera = this.el.sceneEl.camera;
      if (!camera) return;

      // Force camera matrix update to match 8th Wall WebAR SLAM pose
      camera.updateMatrixWorld(true);

      if (this.checkHit(coords, camera)) {
        if (e.touches && e.touches[0]) {
          this.activeTouchId = e.touches[0].identifier;
        }
        this.isDragging = true;

        // Pause rotate and pinch scale gestures so dragging is not interrupted
        this.disableGestures();

        const objPos = this.el.object3D.position;
        this.basePosY = objPos.y - this.currentHoverY;
        this.targetPosition.copy(objPos);

        // Activate Ground Selection Ring UNDER character feet
        if (this.ringGroup) {
          this.ringGroup.visible = true;
          this.ringGroup.position.set(objPos.x, 0.002, objPos.z);
          this.ringMat.opacity = 0.9;
          this.discMat.opacity = 0.35;
        }

        // Lift object up above ground during drag
        this.targetHoverY = this.data.liftHeight;

        // Horizontal plane at ground altitude
        this.dragPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, this.basePosY, 0)
        );

        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersect)) {
          this.dragOffset.copy(this.planeIntersect).sub(new THREE.Vector3(objPos.x, this.basePosY, objPos.z));
        }

        if (window.pixelHUD) {
          window.pixelHUD.showToast('DRAGGING OBJECT (ROTATE & PINCH PAUSED)', 'blue');
        }

        if (e.cancelable && e.type && e.type.startsWith('touch')) {
          e.preventDefault();
        }
      }
    },

    onPointerMove: function (e) {
      if (!this.isDragging) return;
      if (e.touches && e.touches.length > 1) {
        this.onPointerUp();
        return;
      }

      const coords = this.getScreenCoords(e);
      if (!coords) return;

      const camera = this.el.sceneEl.camera;
      if (!camera) return;

      // Sync camera transform matrix before computing ground ray
      camera.updateMatrixWorld(true);
      this.raycaster.setFromCamera(coords, camera);

      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersect)) {
        const newPos = this.planeIntersect.sub(this.dragOffset);
        // Set target floor position
        this.targetPosition.x = newPos.x;
        this.targetPosition.z = newPos.z;
      }

      if (e.cancelable && e.type && e.type.startsWith('touch')) {
        e.preventDefault();
      }
    },

    onPointerUp: function () {
      if (this.isDragging) {
        this.isDragging = false;
        this.activeTouchId = null;
        // Drop character down onto floor
        this.targetHoverY = 0.0;

        // Restore rotate and pinch scale gestures
        this.enableGestures();

        if (window.pixelHUD) {
          window.pixelHUD.showToast('OBJECT DROPPED & PLACED', 'green');
        }
      }
    },

    tick: function (time, timeDelta) {
      if (!timeDelta) return;
      const deltaSec = timeDelta / 1000;
      const obj = this.el.object3D;

      const lerpFactor = Math.min(1.0, deltaSec * this.data.lerpSpeed);

      // Lerp hover elevation Y (lift up on drag, drop down on release)
      this.currentHoverY += (this.targetHoverY - this.currentHoverY) * lerpFactor;

      // Lerp horizontal X & Z position
      const distSq = obj.position.distanceToSquared(this.targetPosition);
      if (this.isDragging || distSq > 0.00001 || Math.abs(this.targetHoverY - this.currentHoverY) > 0.001) {
        obj.position.x += (this.targetPosition.x - obj.position.x) * lerpFactor;
        obj.position.z += (this.targetPosition.z - obj.position.z) * lerpFactor;
        obj.position.y = this.basePosY + this.currentHoverY;

        // Move target ring on ground strictly UNDER character
        if (this.ringGroup) {
          this.ringGroup.position.x = obj.position.x;
          this.ringGroup.position.z = obj.position.z;
          const pulse = 1.0 + 0.06 * Math.sin(time * 0.008);
          this.ringGroup.scale.set(pulse, pulse, pulse);
        }

        const posX = obj.position.x;
        const posY = obj.position.y;
        const posZ = obj.position.z;

        // Sync position attribute and HUD telemetry matrix
        this.el.setAttribute('position', `${posX.toFixed(2)} ${posY.toFixed(2)} ${posZ.toFixed(2)}`);

        if (window.pixelHUD) {
          window.pixelHUD.updateMatrixDisplay(posX, posY, posZ);
          window.pixelHUD.transformState.posX = posX;
          window.pixelHUD.transformState.posY = posY;
          window.pixelHUD.transformState.posZ = posZ;
        }
      }

      // Smoothly fade out ground target ring after drop settling
      if (!this.isDragging && this.currentHoverY < 0.02 && this.ringGroup && this.ringGroup.visible) {
        this.ringMat.opacity *= 0.88;
        this.discMat.opacity *= 0.88;
        if (this.ringMat.opacity < 0.05) {
          this.ringGroup.visible = false;
        }
      }
    }
  });
}
