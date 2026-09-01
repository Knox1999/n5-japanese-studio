import { ImageResponse } from 'next/og';

export const alt='The Nihongo Vibes — Bangla-first JLPT N5 Learning Studio';
export const size={width:1200,height:630};
export const contentType='image/png';
export const dynamic='force-static';

export default function OpenGraphImage(){
  return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',background:'#06172d',color:'#f7fbff',padding:'72px 82px',position:'relative',overflow:'hidden'}}>
    <div style={{position:'absolute',width:520,height:520,borderRadius:520,background:'#de4963',opacity:.18,right:-110,top:-170,display:'flex'}}/>
    <div style={{position:'absolute',width:420,height:420,borderRadius:420,background:'#25c6b8',opacity:.13,left:330,bottom:-300,display:'flex'}}/>
    <div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',width:'100%'}}>
      <div style={{display:'flex',alignItems:'center',gap:24}}><div style={{width:92,height:92,borderRadius:28,background:'#de4963',display:'flex',alignItems:'center',justifyContent:'center',fontSize:54,fontWeight:800}}>日</div><div style={{display:'flex',flexDirection:'column'}}><span style={{fontSize:28,fontWeight:800,letterSpacing:4}}>THE NIHONGO VIBES</span><span style={{fontSize:20,color:'#9fc2d7',letterSpacing:2}}>JLPT N5 STUDY STUDIO</span></div></div>
      <div style={{display:'flex',flexDirection:'column',gap:18,maxWidth:930}}><span style={{fontSize:24,color:'#56d5c8',fontWeight:700}}>FREE BANGLA + ENGLISH JAPANESE LEARNING</span><strong style={{fontSize:64,lineHeight:1.08}}>Understand. Listen. Recall. Pass N5 with confidence.</strong><span style={{fontSize:28,color:'#bfd3df'}}>Vocabulary · Grammar · Listening · Smart Review · Timed Mock Tests</span></div>
      <div style={{display:'flex',gap:18}}>{['25 guided lessons','Instant Japanese audio','Progress sync'].map(item=><span key={item} style={{padding:'12px 20px',border:'1px solid #31536a',borderRadius:999,fontSize:20}}>{item}</span>)}</div>
    </div>
  </div>,size);
}
