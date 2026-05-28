type ParticleWorkerRequest = {
  formationCount: number
  cyberCount: number
}

const workerScope = globalThis as DedicatedWorkerGlobalScope & {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<ParticleWorkerRequest>) => void,
  ) => void
}

workerScope.addEventListener('message', ({ data }: MessageEvent<ParticleWorkerRequest>) => {
  const { formationCount, cyberCount } = data
  const start = new Float32Array(formationCount * 3)
  const end = new Float32Array(formationCount * 3)
  const colors = new Float32Array(formationCount * 3)
  const cyberPositions = new Float32Array(cyberCount * 3)
  const cyberVelocities = new Float32Array(cyberCount * 3)

  for (let i = 0; i < formationCount; i += 1) {
    start[i * 3] = (Math.random() - 0.5) * 1000
    start[i * 3 + 1] = (Math.random() - 0.5) * 1000
    start[i * 3 + 2] = (Math.random() - 0.5) * 1000

    const phi = Math.acos(-1 + (2 * i) / formationCount)
    const theta = Math.sqrt(formationCount * Math.PI) * phi
    const radius = 65

    end[i * 3] = radius * Math.cos(theta) * Math.sin(phi)
    end[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi)
    end[i * 3 + 2] = radius * Math.cos(phi)

    const hue = 0.5 + (i / formationCount) * 0.2
    const chroma = (1 - Math.abs(2 * 0.5 - 1)) * 0.8
    const x = chroma * (1 - Math.abs(((hue * 6) % 2) - 1))
    const match = 0.5 - chroma / 2
    const segment = Math.floor(hue * 6)
    const rgb = segment === 3 ? [0, x, chroma] : segment === 4 ? [x, 0, chroma] : [chroma, 0, x]

    colors[i * 3] = rgb[0] + match
    colors[i * 3 + 1] = rgb[1] + match
    colors[i * 3 + 2] = rgb[2] + match
  }

  for (let i = 0; i < cyberCount; i += 1) {
    const radius = 160 + Math.random() * 250
    const phi = Math.acos(-1 + 2 * Math.random())
    const theta = Math.random() * Math.PI * 2

    cyberPositions[i * 3] = radius * Math.cos(theta) * Math.sin(phi)
    cyberPositions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi)
    cyberPositions[i * 3 + 2] = radius * Math.cos(phi)

    cyberVelocities[i * 3] = (Math.random() - 0.5) * 0.2
    cyberVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2
    cyberVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2
  }

  workerScope.postMessage({ start, end, colors, cyberPositions, cyberVelocities }, [
    start.buffer,
    end.buffer,
    colors.buffer,
    cyberPositions.buffer,
    cyberVelocities.buffer,
  ])
})

export {}
