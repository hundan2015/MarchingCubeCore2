# Marching cube in WebGPU

## 计算着色器管线

WebGPU对应的编程语言WGSL是一种类似Rust的shader语言。其中最需要注意的是其具有非常严格的类型检查。

### 关键概念

#### bindGroupLayout

提供了一个在着色器中绑定的模板。

```javascript
var bindGroupLayout = device.createBindGroupLayout({
                    entries: [
                        {
                            binding: 0,
                            visibility: GPUShaderStage.COMPUTE,
                            buffer: { type: "storage" },
                        },
                    ],
                });
```

#### bindGroup

规定了具体在绑定层中的Buffer，一般和bindGroupLayout相对应。

```javascript
var bindGroup = device.createBindGroup({
                    layout: bindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: input },
                        },
                    ],
                });
```

#### buffer

在GPU中开辟一个区域，用于存储数据。其中如果需要读取数据的话，需要一个额外的stagingBuffer做对拷。buffer需要规定buffer的用途与大小（字节）。注意Buffer大小不可以超过134217728字节。

```javascript
var input = device.createBuffer({
                    size: 4,
                    usage:
                        GPUBufferUsage.STORAGE |
                        GPUBufferUsage.COPY_SRC |
                        GPUBufferUsage.COPY_DST,
                });
 var stagingBuffer = device.createBuffer({
                    size: 4,
                    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
                });
```

如果是stagingBuffer的话，WebGPU会自动将其对应到内存的某一段区域。需要用js手动同步。类似下面的操作：

```javascript
await stagingBuffer.mapAsync(GPUMapMode.READ, 0, 4);
var copyArrayBuffer = stagingBuffer.getMappedRange();
var data = copyArrayBuffer.slice(0, 4);
stagingBuffer.unmap();
return new Float32Array(data);
```

如果需要对buffer写入的话，需要首先使用js中的ArrayBuffer，然后调用方法`device.queue.writeBuffer`写入。其中需要注意的是在写入数据的时候需要按照小端字节序。就像下面的代码所示：

```javascript
 let pointTableData = new ArrayBuffer(16 * points.length);
    let pointTableDataview = new DataView(pointTableData);
    for (var i = 0; i < points.length; i++) {
        pointTableDataview.setFloat32(i * 16, points[i].position.x, true);
        pointTableDataview.setFloat32(i * 16 + 4, points[i].position.y, true);
        pointTableDataview.setFloat32(i * 16 + 8, points[i].position.z, true);
        pointTableDataview.setFloat32(i * 16 + 12, points[i].value, true);
    }
    //console.log(new Float32Array(pointTableData));
    device.queue.writeBuffer(pointsBuffer, 0, pointTableData);
```

### 完整版

```javascript
let func = async () => {
                var adapter = await navigator.gpu.requestAdapter();
                var device = await adapter.requestDevice();
                var module = device.createShaderModule({
                    code: computeShader,
                });
                var bindGroupLayout = device.createBindGroupLayout({
                    entries: [
                        {
                            binding: 0,
                            visibility: GPUShaderStage.COMPUTE,
                            buffer: { type: "storage" },
                        },
                    ],
                });
                var pipeline = device.createComputePipeline({
                    compute: { module: module, entryPoint: "main" },
                    layout: device.createPipelineLayout({
                        bindGroupLayouts: [bindGroupLayout],
                    }),
                });

                var input = device.createBuffer({
                    size: 4,
                    usage:
                        GPUBufferUsage.STORAGE |
                        GPUBufferUsage.COPY_SRC |
                        GPUBufferUsage.COPY_DST,
                });

                device.queue.writeBuffer(input, 0, new Float32Array([1]));

                var stagingBuffer = device.createBuffer({
                    size: 4,
                    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
                });

                var bindGroup = device.createBindGroup({
                    layout: bindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: input },
                        },
                    ],
                });

                var commandEncoder = device.createCommandEncoder();
                var passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(pipeline);
                passEncoder.setBindGroup(0, bindGroup);
                passEncoder.dispatchWorkgroups(1);
                passEncoder.end();
                commandEncoder.copyBufferToBuffer(
                    input,
                    0,
                    stagingBuffer,
                    0,
                    4
                );
                var commands = commandEncoder.finish();
                device.queue.submit([commands]);

                await stagingBuffer.mapAsync(GPUMapMode.READ, 0, 4);
                var copyArrayBuffer = stagingBuffer.getMappedRange();
                var data = copyArrayBuffer.slice(0, 4);
                stagingBuffer.unmap();
                return new Float32Array(data);
            };

            let res = func();
            res.then((data) => {
                console.log(data);
            });
```

#### 工作组与工作

一般在WGSL中我们规定工作组的大小。类似下面代码所示：

```wgsl
@compute @workgroup_size(1)
```

在这段代码中我们规定了一个大小为(1,1,1)的工作组。在之前js的部分，我们有`dispatchWorkgroups(1)`定义了有(1,1,1)的工作负载。如果我们定义`workgroup_size(1,2,3)``dispatchWorkgroups(3,2,1)`，则计算着色器会计算`1*2*3*3*2*1 = 12`次。

需要注意是workgroup_size()中的乘积不可以超过256。

在这里给出一个最简单的compute shader，对应上面的js代码：

```rust
@group(0) @binding(0) var<storage,read_write> input:array<f32>;
@compute @workgroup_size(1)
fn main(){
}
```

其中工作组和工作负载这个概念在compute shader中格外重要。因为这两个概念就像键，定义了每次运算的id。一般他们以默认参数的情况出现，就像下面所示：

```rust
fn main(
    @builtin(workgroup_id) workgroup_id: vec3<u32>, 
    @builtin(local_invocation_id) local_invocation_id: vec3<u32>, 
    @builtin(global_invocation_id) global_invocation_id: vec3<u32>, 
    @builtin(local_invocation_index) local_invocation_index: u32, 
    @builtin(num_workgroups) num_workgroups: vec3<u32>)
```

针对每一次计算我们可以获得一个ID。如下计算方法：

```rust
let workgroup_index = workgroup_id.x + 
                      workgroup_id.y * num_workgroups.x + 
                      workgroup_id.z * num_workgroups.x * num_workgroups.y;
var id: u32 = workgroup_index + local_invocation_index;
```

之后的所有并行运算都是基于这个id寻找需要得到的数据位置，并且得到需要写入的位置。

### 调试方法

WebGPU除了编译时的错误，在运行时很难debug，就像是其他着色器语言一样狗屎。因此一般我们开辟一个新的Buffer，记录每个GPU单元计算的值，然后写进Buffer并用stageingBuffer把它读出来，然后验算数据是否正确。
