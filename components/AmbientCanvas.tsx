'use client';

import { useEffect, useRef } from 'react';

export default function AmbientCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tiny = window.matchMedia('(max-width: 640px)').matches;
    if (reduced || tiny) return;
    let cleanup = () => {};
    let disposed = false;
    (async () => {
      try {
        const THREE = await import('three');
        if (disposed || !canvas) return;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
        renderer.setClearColor(0x000000,0);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(44,1,.1,100);
        camera.position.z=7.4;

        const mobile=window.matchMedia('(max-width: 900px)').matches;
        const count=mobile?42:92;
        const geometry=new THREE.BufferGeometry();
        const points=new Float32Array(count*3);
        const speed=new Float32Array(count);
        const phase=new Float32Array(count);
        for(let i=0;i<count;i++){
          points[i*3]=(Math.random()-.5)*9;
          points[i*3+1]=(Math.random()-.5)*5.4;
          points[i*3+2]=(Math.random()-.5)*3.2;
          speed[i]=.0016+Math.random()*.0032;
          phase[i]=Math.random()*Math.PI*2;
        }
        geometry.setAttribute('position',new THREE.BufferAttribute(points,3));
        const material=new THREE.PointsMaterial({color:0x79ddd2,size:mobile?.035:.045,transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending});
        const particles=new THREE.Points(geometry,material);
        scene.add(particles);

        const petalGeo=new THREE.BufferGeometry();
        const petalCount=mobile?18:34;
        const petals=new Float32Array(petalCount*3);
        for(let i=0;i<petalCount;i++){petals[i*3]=(Math.random()-.5)*8;petals[i*3+1]=(Math.random()-.5)*4.8;petals[i*3+2]=(Math.random()-.5)*2.5}
        petalGeo.setAttribute('position',new THREE.BufferAttribute(petals,3));
        const petalMat=new THREE.PointsMaterial({color:0xe99ba9,size:mobile?.055:.07,transparent:true,opacity:.3,depthWrite:false});
        const petalCloud=new THREE.Points(petalGeo,petalMat);scene.add(petalCloud);

        const rings: any[]=[];
        [2.1,2.85,3.6].forEach((r,i)=>{
          const g=new THREE.TorusGeometry(r,.006,4,96);
          const m=new THREE.MeshBasicMaterial({color:i===1?0xd6ad65:0x5bd7cc,transparent:true,opacity:i===1?.08:.055,depthWrite:false});
          const mesh=new THREE.Mesh(g,m);mesh.rotation.x=Math.PI*.48+i*.05;mesh.rotation.y=i*.32;mesh.position.set(2.8,-.8,-2-i*.4);scene.add(mesh);rings.push(mesh);
        });

        let mx=0,my=0,tx=0,ty=0,raf=0,running=true,last=0;
        const pointer=(e:PointerEvent)=>{tx=(e.clientX/window.innerWidth-.5)*.34;ty=(e.clientY/window.innerHeight-.5)*.2};
        if(!mobile)window.addEventListener('pointermove',pointer,{passive:true});
        const resize=()=>{const rect=canvas.getBoundingClientRect();const w=Math.max(1,Math.floor(rect.width)),h=Math.max(1,Math.floor(rect.height));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
        const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
        const animate=(now=performance.now())=>{
          if(!running)return;raf=requestAnimationFrame(animate);if(now-last<28)return;last=now;
          mx+=(tx-mx)*.035;my+=(ty-my)*.035;camera.position.x=mx;camera.position.y=-my;
          const pos=geometry.getAttribute('position') as any;
          for(let i=0;i<count;i++){pos.array[i*3+1]-=speed[i];pos.array[i*3]+=Math.sin(now*.00045+phase[i])*.00048;if(pos.array[i*3+1]<-2.9)pos.array[i*3+1]=2.9}
          pos.needsUpdate=true;particles.rotation.z+=.00028;particles.rotation.y=Math.sin(now*.00012)*.035;
          const pp=petalGeo.getAttribute('position') as any;for(let i=0;i<petalCount;i++){pp.array[i*3+1]-=.0018+(i%5)*.00028;pp.array[i*3]+=.0008*Math.sin(now*.0006+i);if(pp.array[i*3+1]<-2.7){pp.array[i*3+1]=2.7;pp.array[i*3]=(Math.random()-.5)*8}}pp.needsUpdate=true;petalCloud.rotation.z+=.00018;
          rings.forEach((r,i)=>{r.rotation.z+=.00022*(i+1);r.rotation.y+=.00008*(i%2?1:-1)});
          renderer.render(scene,camera);
        };
        const visibility=()=>{running=!document.hidden;if(running)animate();else cancelAnimationFrame(raf)};
        document.addEventListener('visibilitychange',visibility);animate();
        cleanup=()=>{running=false;cancelAnimationFrame(raf);ro.disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pointermove',pointer);geometry.dispose();material.dispose();petalGeo.dispose();petalMat.dispose();rings.forEach(r=>{r.geometry.dispose();r.material.dispose()});renderer.dispose()};
      } catch { /* CSS/SVG ambience remains the fallback. */ }
    })();
    return()=>{disposed=true;cleanup()};
  },[]);
  return <canvas ref={ref} className="future-three-canvas" aria-hidden="true"/>;
}
