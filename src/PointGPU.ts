import { Point } from "./include/Points.js";
import { edgeTable, triTable } from "./include/table.js";
import { computeShader } from "./include/ComputeShader.js";
/**
 * Init adapter.
 */

let adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw Error("Could'nt request WebGPU adapter.");
let device = await adapter.requestDevice();

/**
 * Init static paramenters.
 */

let module = device.createShaderModule({
    code: computeShader,
});

let bindGroupLayout = device.createBindGroupLayout({
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" },
        },
        {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" },
        },
        {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" },
        },
        {
            binding: 3,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" },
        },
        {
            binding: 4,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" },
        },
        {
            binding: 5,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" },
        },
        {
            binding: 6,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" },
        },
        {
            binding: 7,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" },
        },
    ],
});

let pipeline = device.createComputePipeline({
    compute: { module: module, entryPoint: "main" },
    layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
    }),
});

const EDGE_TABLE_BUFFER_SIZE = 4 * edgeTable.length;
const TRI_TABLE_BUFFER_SIZE = 4 * triTable.length;

let triTableBuffer = device.createBuffer({
    size: TRI_TABLE_BUFFER_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
let edgeTableBuffer = device.createBuffer({
    size: EDGE_TABLE_BUFFER_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

let isoBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
let lengthBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
let heightBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
let widthBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

//Init two table buffer.
device.queue.writeBuffer(triTableBuffer, 0, triTable);
device.queue.writeBuffer(edgeTableBuffer, 0, edgeTable);

export let createPointsArrayBuffer = (points: Point[]): Float32Array => {
    let pointTableData = new ArrayBuffer(16 * points.length);
    let pointTableDataview = new DataView(pointTableData);
    for (var i = 0; i < points.length; i++) {
        pointTableDataview.setFloat32(i * 16, points[i].position.x, true);
        pointTableDataview.setFloat32(i * 16 + 4, points[i].position.y, true);
        pointTableDataview.setFloat32(i * 16 + 8, points[i].position.z, true);
        pointTableDataview.setFloat32(i * 16 + 12, points[i].value, true);
    }
    return new Float32Array(pointTableData);
};

interface BufferPair {
    pointsBuffer: GPUBuffer;
    resultBuffer: GPUBuffer;
    stagingBuffer: GPUBuffer;
}
let bufferContainer: Map<number, BufferPair> = new Map();
export let clearBufferContainer = () => {
    bufferContainer.clear();
};
let getPointBuffer = (
    pointsArrayBuffer: Float32Array,
    id: number
): BufferPair => {
    if (bufferContainer.has(id)) {
        return bufferContainer.get(id);
    }
    const RESULT_BUFFER_SIZE = pointsArrayBuffer.length * 3 * 12;
    const POINTS_BUFFER_SIZE = 4 * pointsArrayBuffer.length;
    var pointsBuffer = device.createBuffer({
        size: POINTS_BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    /* var resultsBuffer = device.createBuffer({
        size: RESULT_BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    }); */
    /* var stagingBuffer = device.createBuffer({
        size: RESULT_BUFFER_SIZE,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    }); */
    device.queue.writeBuffer(pointsBuffer, 0, pointsArrayBuffer);
    let result: BufferPair = {
        pointsBuffer: pointsBuffer,
        resultBuffer: undefined,
        stagingBuffer: undefined,
    };
    bufferContainer.set(id, result);
    return result;
};

export let marchingCubeGPU = async (
    pointsArrayBuffer: Float32Array,
    length: number,
    width: number,
    height: number,
    isoLevel: number,
    id: number = 0
): Promise<Float32Array> => {
    console.log("ISO level:" + isoLevel.toString());
    const RESULT_BUFFER_SIZE = pointsArrayBuffer.length * 3 * 12;
    const POINTS_BUFFER_SIZE = 4 * pointsArrayBuffer.length;
    //console.log(RESULT_BUFFER_SIZE);
    //console.log(POINTS_BUFFER_SIZE);

    var buffers = getPointBuffer(pointsArrayBuffer, id);
    if (buffers == undefined) {
        console.log(id);
    }
    var pointsBuffer = buffers.pointsBuffer;
    var resultsBuffer = device.createBuffer({
        size: RESULT_BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    var stagingBuffer = device.createBuffer({
        size: RESULT_BUFFER_SIZE,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    
    device.queue.writeBuffer(isoBuffer, 0, new Float32Array([isoLevel]));
    device.queue.writeBuffer(lengthBuffer, 0, new Uint32Array([length]));
    device.queue.writeBuffer(widthBuffer, 0, new Uint32Array([width]));
    device.queue.writeBuffer(heightBuffer, 0, new Uint32Array([height]));

    var bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: { buffer: triTableBuffer },
            },
            {
                binding: 1,
                resource: { buffer: edgeTableBuffer },
            },
            {
                binding: 2,
                resource: { buffer: pointsBuffer },
            },
            {
                binding: 3,
                resource: { buffer: resultsBuffer },
            },
            {
                binding: 4,
                resource: { buffer: isoBuffer },
            },
            {
                binding: 5,
                resource: { buffer: lengthBuffer },
            },
            // height and width.
            {
                binding: 6,
                resource: { buffer: heightBuffer },
            },
            {
                binding: 7,
                resource: { buffer: widthBuffer },
            },
        ],
    });

    var commandEncoder = device.createCommandEncoder();
    var passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(256, 256, 256);
    passEncoder.end();
    commandEncoder.copyBufferToBuffer(
        resultsBuffer,
        0,
        stagingBuffer,
        0,
        RESULT_BUFFER_SIZE
    );
    var commands = commandEncoder.finish();
    device.queue.submit([commands]);
    await stagingBuffer.mapAsync(GPUMapMode.READ, 0, RESULT_BUFFER_SIZE);
    var copyArrayBuffer = stagingBuffer.getMappedRange(0, RESULT_BUFFER_SIZE);
    var data = copyArrayBuffer.slice(0, RESULT_BUFFER_SIZE);
    stagingBuffer.unmap();
    var temp = new Float32Array(data);
    var count = 0;
    var temp2 = new Float32Array(temp.length);
    for (var i = 0; i < temp.length; i += 9) {
        let isGood = true;
        for (var j = 0; j < 9; j++) {
            temp2[count + j] = temp[i + j];
            if (temp[i + j] == 0) {
                isGood = false;
                break;
            }
        }
        if (isGood) count += 9;
    }
    temp = new Float32Array(temp2.slice(0, count));
    //console.log(temp);
    for (var i = 0; i < temp.length; i += 3) {
        temp[i] -= length / 2;
        temp[i + 1] -= width / 2;
        temp[i + 2] -= height / 2;
    }
    return temp;
};
