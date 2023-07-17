export let computeShader = /* wgsl */ `
struct Point {
    position: vec3<f32>,
    value: f32,
};

struct Triangle {
    first: vec3<f32>,
    second: vec3<f32>,
    third: vec3<f32>
};

struct ResultCell {
    first: Triangle,
    second: Triangle,
    third: Triangle,
    fourth: Triangle
};

@group(0) @binding(0) var <storage,read_write> triTable:array<i32>;
@group(0) @binding(1) var <storage,read_write> edgeTable:array<i32>;
@group(0) @binding(2) var <storage,read_write> points:array<Point>;
@group(0) @binding(3) var <storage,read_write> results:array<f32>;
@group(0) @binding(4) var <storage,read_write> isoLevel:f32;
@group(0) @binding(5) var <storage,read_write> length:u32;
@group(0) @binding(6) var <storage,read_write> height:u32;
@group(0) @binding(7) var <storage,read_write> width:u32;

fn VertexInterp(isolevel: f32, p1: vec3<f32>, p2: vec3<f32>, valp1: f32, valp2: f32) -> vec3<f32> {
    var p: vec3<f32>;
    if abs(isolevel - valp1) < 0.00001 {
        return p1;
    }
    if abs(isolevel - valp2) < 0.00001 {
        return p2;
    }
    if abs(valp1 - valp2) < 0.00001 {
        return p1;
    }
    let mu = (isolevel - valp1) / (valp2 - valp1);
    p.x = p1.x + mu * (p2.x - p1.x);
    p.y = p1.y + mu * (p2.y - p1.y);
    p.z = p1.z + mu * (p2.z - p1.z);
    return p;
}

    @compute @workgroup_size(8,8,4)
fn main(@builtin(workgroup_id) workgroup_id: vec3<u32>, @builtin(local_invocation_id) local_invocation_id: vec3<u32>, @builtin(global_invocation_id) global_invocation_id: vec3<u32>, @builtin(local_invocation_index) local_invocation_index: u32, @builtin(num_workgroups) num_workgroups: vec3<u32>) {
    let workgroup_index = workgroup_id.x + workgroup_id.y * num_workgroups.x + workgroup_id.z * num_workgroups.x * num_workgroups.y;
    // id is right.
    var id: u32 = workgroup_index + local_invocation_index;
    let cubeIndex = array<u32,8>(
        id,
        id + u32(1),
        id + length,
        id + length + u32(1),
        id + width * length,
        id + width * length + u32(1),
        id + width * length + length,
        id + width * length + length + u32(1),
    );

    if id >= (length ) * (height) * (width ) { return; }

    var targetIndex: i32 = 0;
    if points[(cubeIndex[0])].value < isoLevel {
        targetIndex |= 1;
    }
    if points[(cubeIndex[1])].value < isoLevel {
        targetIndex |= 2;
    }
    if points[(cubeIndex[2])].value < isoLevel {
        targetIndex |= 8;
    }
    if points[(cubeIndex[3])].value < isoLevel {
        targetIndex |= 4;
    }
    if points[(cubeIndex[4])].value < isoLevel {
        targetIndex |= 16;
    }
    if points[(cubeIndex[5])].value < isoLevel {
        targetIndex |= 32;
    }
    if points[(cubeIndex[6])].value < isoLevel {
        targetIndex |= 128;
    }
    if points[(cubeIndex[7])].value < isoLevel {
        targetIndex |= 64;
    }


    let bits = edgeTable[targetIndex];
    if bits == 0 {
        return;
    }
    var vertlist = array<vec3<f32>,12>();
    if (bits & 1) != 0 {
        vertlist[0] = VertexInterp(isoLevel, points[(cubeIndex[0])].position, points[(cubeIndex[1])].position, points[(cubeIndex[0])].value, points[(cubeIndex[1])].value);
    }
    if (bits & 2) != 0 {
        vertlist[1] = VertexInterp(isoLevel, points[(cubeIndex[1])].position, points[(cubeIndex[3])].position, points[(cubeIndex[1])].value, points[(cubeIndex[3])].value);
    }
    if (bits & 4) != 0 {
        vertlist[2] = VertexInterp(isoLevel, points[(cubeIndex[2])].position, points[(cubeIndex[3])].position, points[(cubeIndex[2])].value, points[(cubeIndex[3])].value);
    }
    if (bits & 8) != 0 {
        vertlist[3] = VertexInterp(isoLevel, points[(cubeIndex[0])].position, points[(cubeIndex[2])].position, points[(cubeIndex[0])].value, points[(cubeIndex[2])].value);
    }
    if (bits & 16) != 0 {
        vertlist[4] = VertexInterp(isoLevel, points[(cubeIndex[4])].position, points[(cubeIndex[5])].position, points[(cubeIndex[4])].value, points[(cubeIndex[5])].value);
    }
    if (bits & 32) != 0 {
        vertlist[5] = VertexInterp(isoLevel, points[(cubeIndex[5])].position, points[(cubeIndex[7])].position, points[(cubeIndex[5])].value, points[(cubeIndex[7])].value);
    }
    if (bits & 64) != 0 {
        vertlist[6] = VertexInterp(isoLevel, points[(cubeIndex[6])].position, points[(cubeIndex[7])].position, points[(cubeIndex[6])].value, points[(cubeIndex[7])].value);
    }
    if (bits & 128) != 0 {
        vertlist[7] = VertexInterp(isoLevel, points[(cubeIndex[4])].position, points[(cubeIndex[6])].position, points[(cubeIndex[4])].value, points[(cubeIndex[6])].value);
    }
    if (bits & 256) != 0 {
        vertlist[8] = VertexInterp(isoLevel, points[(cubeIndex[0])].position, points[(cubeIndex[4])].position, points[(cubeIndex[0])].value, points[(cubeIndex[4])].value);
    }
    if (bits & 512) != 0 {
        vertlist[9] = VertexInterp(isoLevel, points[(cubeIndex[1])].position, points[(cubeIndex[5])].position, points[(cubeIndex[1])].value, points[(cubeIndex[5])].value);
    }
    if (bits & 1024) != 0 {
        vertlist[10] = VertexInterp(isoLevel, points[(cubeIndex[3])].position, points[(cubeIndex[7])].position, points[(cubeIndex[3])].value, points[(cubeIndex[7])].value);
    }
    if (bits & 2048) != 0 {
        vertlist[11] = VertexInterp(isoLevel, points[(cubeIndex[2])].position, points[(cubeIndex[6])].position, points[(cubeIndex[2])].value, points[(cubeIndex[6])].value);
    }
    var triangles = array<Triangle,4>();
    var count: u32 = 0;
    for (var start = 0; triTable[16 * targetIndex + start] != -1; start += 3) {
        let tempIndex = (16 * targetIndex) + start;
        let tempShit = start / 3;
        results[id * 36 + count] = vertlist[(triTable[tempIndex])].x;
        results[id * 36 + count + 1] = vertlist[(triTable[tempIndex])].y;
        results[id * 36 + count + 2] = vertlist[(triTable[tempIndex])].z;
        results[id * 36 + count + 3] = vertlist[(triTable[tempIndex + 1])].x;
        results[id * 36 + count + 4] = vertlist[(triTable[tempIndex + 1])].y;
        results[id * 36 + count + 5] = vertlist[(triTable[tempIndex + 1])].z;
        results[id * 36 + count + 6] = vertlist[(triTable[tempIndex + 2])].x;
        results[id * 36 + count + 7] = vertlist[(triTable[tempIndex + 2])].y;
        results[id * 36 + count + 8] = vertlist[(triTable[tempIndex + 2])].z;
        count += 9;
    }
}`;
