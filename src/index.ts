import * as THREE from "../node_modules/three/build/three.module.js";
import * as POINTGPU from "./PointGPU.js";
import * as POINT from "./include/Points.js";

/**
 * Define basic things.
 */
let points: POINT.Point[] = POINT.getTestPoints(50);
let pointsArray: Float32Array = POINTGPU.createPointsArrayBuffer(points);

export let loadPoints = (
    file: File,
    length: number,
    width: number,
    height: number
): POINT.Point[] => {
    var reader: FileReader = new FileReader();
    reader.readAsArrayBuffer(file);
    var buffer = reader.result;
    var arrayBufferView = new Uint8Array(buffer as ArrayBuffer);
    let result: POINT.Point[] = [];
    for (let i = 0; i < length; ++i) {
        for (let j = 0; j < width; ++j) {
            for (let k = 0; k < height; ++k) {
                let id = i + j * length + k * width * length;
                let pointTemp: POINT.Point = {
                    position: new THREE.Vector3(i, j, k),
                    value: arrayBufferView[id],
                };
                result.push(pointTemp);
            }
        }
    }
    return result;
};

export let getNewModel = (
    isoLevel: number,
    slice: number,
    length: number,
    width: number,
    height: number
) => {
    let promises = [];
    let pointUnit = length * width * 4;
    let i = 0;
    for (let i = 0; i < pointsArray.length; i += pointUnit * slice) {
        var tempPromise = POINTGPU.marchingCubeGPU(
            pointsArray.slice(i, i + pointUnit * (slice + 1)),
            length,
            width,
            slice + 1,
            isoLevel
        );
        promises.push(tempPromise);
    }

    Promise.all(promises).then((verticess) => {
        // Remove everything in the scene.
        while (scene.children.length > 0) {
            const object = scene.children[0];
            scene.remove(object);
        }
        // Add Vertices.
        for (var vertices of verticess) {
            var geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                "position",
                new THREE.BufferAttribute(vertices, 3)
            );
            var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            material.wireframe = true;
            var cube = new THREE.Mesh(geometry, material);
            scene.add(cube);
            vertices = undefined;
        }
    });
};

/**
 * Init Three.js scene.
 */

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
console.log("Hi");
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 70;

getNewModel(30, 10, 50, 50, 50);
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
