import * as THREE from "three";
export interface Point {
    position: THREE.Vector3; // 12B
    value: number; // 4B
}

export interface Face {
    first: THREE.Vector3;
    second: THREE.Vector3;
    third: THREE.Vector3;
}

export let getTestPoints = (size: number): Point[] => {
    let result: Point[] = [];
    //Make Points;
    for (let i = 0; i < size; ++i) {
        for (let j = 0; j < size; ++j) {
            for (let k = 0; k < size; ++k) {
                let id = i + j * size + k * size * size;
                let pointTemp: Point = {
                    position: new THREE.Vector3(i, j, k),
                    value: 0,
                };
                pointTemp.position = new THREE.Vector3(i, j, k);
                let reletiveX = i - size / 2;
                let reletiveY = j - size / 2;
                let reletiveZ = k - size / 2;
                pointTemp.value =
                    reletiveX * reletiveX +
                    reletiveY * reletiveY +
                    reletiveZ * reletiveZ;
                result.push(pointTemp);
            }
        }
    }
    return result;
};
export interface PointsInfo {
    length: number;
    width: number;
    height: number;
    points: Point[];
    min: number;
    max: number;
}
export let loadPoints = (
    buffer: ArrayBuffer,
    length: number,
    width: number,
    height: number
): PointsInfo => {
    var arrayBufferView = new Uint16Array(buffer as ArrayBuffer);
    console.log(arrayBufferView);
    let result: Point[] = [];
    let max = -1;
    let min = 65536;
    for (let k = 0; k < height; ++k) {
        for (let j = 0; j < width; ++j) {
            for (let i = 0; i < length; ++i) {
                let id = i + j * length + k * width * length;
                let pointTemp: Point = {
                    position: new THREE.Vector3(i, j, k),
                    value: arrayBufferView[id],
                };
                max = Math.max(max, pointTemp.value);
                min = Math.min(min, pointTemp.value);
                result.push(pointTemp);
            }
        }
    }
    return {
        max: max,
        min: min,
        points: result,
        length: length,
        width: width,
        height: height
    };
};
