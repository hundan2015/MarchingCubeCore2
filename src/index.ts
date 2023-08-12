import * as THREE from "three";
import * as POINTGPU from "./PointGPU.js";
import * as POINT from "./include/Points.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * Define basic things.
 */
let points: POINT.Point[] = POINT.getTestPoints(50);
let pointsArray: Float32Array = POINTGPU.createPointsArrayBuffer(points);
// Define global paramenters.
let length = 50;
let width = 50;
let height = 50;

const floatingLoading = document.getElementById("floating-tip");
let onWaitingLoading = new Event("onWaitingLoading");
let avokeLoading = new Event("avokeLoading");
floatingLoading.addEventListener("onWaitingLoading", () => {
    floatingLoading.style.display = "none";
});
floatingLoading.addEventListener("avokeLoading", () => {
    floatingLoading.style.display = "block";
});

export let getNewModel = (
    isoLevel: number,
    slice: number,
    length: number,
    width: number,
    height: number
) => {
    floatingLoading.dispatchEvent(avokeLoading);
    let start = new Date();
    let promises = [];
    let pointUnit = length * width * 4;
    let i = 0;
    for (let i = 0; i < pointsArray.length; i += pointUnit * slice) {
        var tempPromise = POINTGPU.marchingCubeGPU(
            pointsArray.slice(i, i + pointUnit * (slice + 2)),
            length,
            width,
            slice,
            isoLevel,
            i
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
            console.log(object);
            if (object instanceof THREE.Mesh) {
                meshes.push(object);
            }
        });
        console.log(meshes);
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
        console.log("Vertices length:" + totalLength.toString());
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
        //var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        //material.wireframe = true;
        //var material = new THREE.MeshDepthMaterial();
        const material = new THREE.MeshPhongMaterial({
            side: THREE.DoubleSide,
            flatShading: true,
        });

        var cube = new THREE.Mesh(geometry, material);
        //len:112.52,height:102.5
        //0.219,2.5
        //cube.scale.z = 11.4;

        // Set height scale.
        let heightScaleWidget = document.getElementById(
            "heightScale"
        ) as HTMLInputElement;
        if (heightScaleWidget.value == "") {
            heightScaleWidget.value = "11.4";
        }

        cube.scale.set(0.01, 0.01, 0.01 * Number(heightScaleWidget.value));
        cube.rotateX(Math.PI / 2);
        cube.rotateZ(-Math.PI / 2);
        cube.position.set(0, 1, 0);

        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);
        vertices = undefined;
        console.log("Add end.");
        let end = new Date();
        console.log("Total time:" + String(end.getTime() - start.getTime()));
        floatingLoading.dispatchEvent(onWaitingLoading);
        /* {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            //const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const material = new THREE.MeshLambertMaterial({
                side: THREE.DoubleSide,
            });
            const cube = new THREE.Mesh(geometry, material);
            scene.add(cube);
        } */
    });
};

/**
 * Init html elements.
 */
let isoSlider = document.getElementById("myRange") as HTMLInputElement;
console.dir(isoSlider);
isoSlider.onchange = () => {
    floatingLoading.dispatchEvent(avokeLoading);
    let value = isoSlider.value;
    getNewModel(Number(value), 1, length, width, height);
};

let fileInput = document.getElementById("inputFile") as HTMLInputElement;
fileInput.addEventListener("change", () => {
    floatingLoading.dispatchEvent(avokeLoading);
    let tempFile = fileInput.files[0];
    console.log(tempFile);
    function loadFile(): Promise<ArrayBuffer> {
        let widthWidget = document.getElementById("width") as HTMLInputElement;
        let lengthWidget = document.getElementById(
            "length"
        ) as HTMLInputElement;
        let heightWidget = document.getElementById(
            "height"
        ) as HTMLInputElement;
        let heightScaleWidget = document.getElementById(
            "heightScale"
        ) as HTMLInputElement;
        if (
            widthWidget.value == "" ||
            lengthWidget.value == "" ||
            heightWidget.value == ""
        ) {
            fileInput.value = "";
            alert("Please input the length, width and height.");
            return;
        }
        if (heightScaleWidget.value == "") {
            heightScaleWidget.value = "11.4";
        }
        return new Promise((resolve) => {
            let reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result as ArrayBuffer);
            };
            reader.readAsArrayBuffer(tempFile);
        });
    }
    loadFile().then((tempFile) => {
        //Setup points.
        let widthWidget = document.getElementById("width") as HTMLInputElement;
        let lengthWidget = document.getElementById(
            "length"
        ) as HTMLInputElement;
        let heightWidget = document.getElementById(
            "height"
        ) as HTMLInputElement;
        let tempInfo = POINT.loadPoints(
            tempFile,
            Number(lengthWidget.value),
            Number(widthWidget.value),
            Number(heightWidget.value)
        );
        //Setup isoSlider.
        let isoSlider = document.getElementById("myRange") as HTMLInputElement;
        isoSlider.max = String(tempInfo.max);
        isoSlider.min = String(tempInfo.min);
        isoSlider.step = String((tempInfo.max - tempInfo.min) / 100);
        points = tempInfo.points;
        length = Number(lengthWidget.value);
        width = Number(widthWidget.value);
        height = Number(heightWidget.value);
        pointsArray = POINTGPU.createPointsArrayBuffer(points);
        POINTGPU.clearBufferContainer();
        getNewModel(Number(isoSlider.value), 1, length, width, height);
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

var gridHelper = new THREE.GridHelper(200, 25);
gridHelper.position.y = -2.5;
camera.position.y = -0.5;
scene.add(gridHelper);

console.log("Hi");
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth * 0.9, window.innerHeight * 0.9);
let canvasContainer = document.getElementById("canvas-container");
canvasContainer.appendChild(renderer.domElement);
renderer.domElement.style.marginLeft = "auto";
renderer.domElement.style.marginRight = "auto";

let cameraControls = new OrbitControls(camera, renderer.domElement);
cameraControls.addEventListener("change", () => {
    renderer.render(scene, camera);
});
camera.position.z = 5;

// load default model.
POINTGPU.clearBufferContainer();
getNewModel(30, 10, 50, 50, 50);

isoSlider.value = "30";

let ambientLight = new THREE.AmbientLight(0x7c7c7c, 1);

let light = new THREE.PointLight(0xffffff, 3);
light.castShadow = true;

light.position.set(5, 5, 5);
light.visible = true;

scene.add(ambientLight);
scene.add(light);
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

addEventListener("resize", () => {
    // 更新修改相机比例
    camera.aspect = window.innerWidth / window.innerHeight;
    // 更新摄像机的投影矩阵
    camera.updateProjectionMatrix();
    // 更新画布大小
    renderer.setSize(
        window.innerWidth * 0.9, // 宽度
        window.innerHeight * 0.9 // 高度
    );
    // 更新画布像素比
    renderer.setPixelRatio(window.devicePixelRatio);
});
animate();
