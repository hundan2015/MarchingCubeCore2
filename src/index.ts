import * as THREE from "../node_modules/three/build/three.module.js";
import * as POINTGPU from "./PointGPU.js";
import * as POINT from "./include/Points.js";

/**
 * Define basic things.
 */
let points: POINT.Point[] = POINT.getTestPoints(50);
let pointsArray: Float32Array = POINTGPU.createPointsArrayBuffer(points);
// Define global paramenters.
let length = 50;
let width = 50;
let height = 50;

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
            pointsArray.slice(i, i + pointUnit * (slice + 2)),
            length,
            width,
            slice,
            isoLevel
        );
        promises.push(tempPromise);
    }

    Promise.all(promises).then((verticess) => {
        // Remove everything in the scene.
        /* while (scene.children.length > 0) {
            const object = scene.children[0];
            scene.remove(object);
        } */
        var meshes = [];
        scene.traverse(function (object) {
            if (object instanceof THREE.Mesh) {
                meshes.push(object);
            }
        });
        for (var i = 0; i < meshes.length; i++) {
            var mesh = meshes[i];
            scene.remove(mesh);
        }
        for (var i = 0; i < meshes.length; i++) {
            var mesh = meshes[i];
            mesh.geometry.dispose();
            mesh.material.dispose();
        }

        // Add Vertices.
        let totalLength = 0;
        for (var vertices of verticess) {
            totalLength += vertices.length;
        }
        let finalVertices = new Float32Array(totalLength);
        let tempLength = 0;
        for (var vertices of verticess) {
            finalVertices.set(vertices, tempLength);
            tempLength += vertices.length;
        }
        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(finalVertices, 3)
        );
        var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        material.wireframe = true;
        //var material = new THREE.MeshDepthMaterial();
        var cube = new THREE.Mesh(geometry, material);
        cube.rotation.y = 180;
        scene.add(cube);
        vertices = undefined;
        console.log("Add end.");
    });
};

/**
 * Init html elements.
 */
let isoSlider = document.getElementById("myRange") as HTMLInputElement;
console.dir(isoSlider);
isoSlider.onchange = () => {
    let value = isoSlider.value;
    getNewModel(Number(value), 1, length, width, height);
};

let fileInput = document.getElementById("inputFile") as HTMLInputElement;
fileInput.addEventListener("change", () => {
    let tempFile = fileInput.files[0];
    console.log(tempFile);
    // TODO: load points.
    let start = new Date();
    function loadFile(): Promise<ArrayBuffer> {
        return new Promise((resolve) => {
            let reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as ArrayBuffer);
            };
            reader.readAsArrayBuffer(tempFile);
        });
    }
    loadFile().then((tempFile) => {
        points = POINT.loadPoints(tempFile, 512, 512, 41);
        length = 512;
        width = 512;
        height = 41;
        pointsArray = POINTGPU.createPointsArrayBuffer(points);
        getNewModel(Number(isoSlider.value), 1, length, width, height);
        let end = new Date();
        console.log(end.getTime() - start.getTime());
    });
});

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
camera.position.z = 500;
// load default model.
getNewModel(30, 10, 50, 50, 50);
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
