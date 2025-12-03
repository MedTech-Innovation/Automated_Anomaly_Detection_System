import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function BrainVolumeViewer({ mask }) {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mask) return;

        const width = mask.length;
        const height = mask[0].length;
        const depth = mask[0][0].length;

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(600, 600);
        mountRef.current!.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        camera.position.z = 200;

        const controls = new (require("three/examples/jsm/controls/OrbitControls").OrbitControls)(camera, renderer.domElement);

        // Convert 3D mask into 3D texture
        const textureData = new Uint8Array(width * height * depth);
        let i = 0;

        for (let x = 0; x < width; x++)
        for (let y = 0; y < height; y++)
        for (let z = 0; z < depth; z++)
            textureData[i++] = mask[x][y][z] ? 255 : 0;

        const texture = new THREE.Data3DTexture(textureData, width, height, depth);
        texture.format = THREE.RedFormat;
        texture.type = THREE.UnsignedByteType;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;

        const material = new THREE.MeshBasicMaterial({
            map: texture,
        });

        const geometry = new THREE.BoxGeometry(100, 100, 100);
        const cube = new THREE.Mesh(geometry, material);

        scene.add(cube);

        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };

        animate();

    }, [mask]);

    return <div ref={mountRef}></div>;
}
