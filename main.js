import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';

if(WebGL.isWebGLAvailable) {
    // Initialization
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement); // Add renderer to the DOM
    
    // Create scene
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial( {color: 0x00fff0} );
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    camera.position.z = 10;

    const lineMat = new THREE.LineBasicMaterial( {color: 0xffffff} );
    const points = [];
    points.push(new THREE.Vector3(-10, 0, 0));
    points.push(new THREE.Vector3(0, 10, 0));
    points.push(new THREE.Vector3(10, 0, 0));
    
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);

    // Animate
    function animate(){
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();

} else {
    const warning = WebGL.getWebGLErrorMessage();
	document.body.appendChild( warning );
}
