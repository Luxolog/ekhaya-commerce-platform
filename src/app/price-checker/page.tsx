"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type MarketplaceProduct = { marketplace?: string; id: string; title: string; brand?: string | null; price: number | null; currency: string; image?: string | null; url?: string | null; in_stock?: boolean | null; rating?: number | null; review_count?: number | null; seller?: string | null; };
type Mode = "name" | "barcode" | "photo";
const money = (v: number) => new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR",maximumFractionDigits:2}).format(v);
const categories = [
  ["general","General / other"],["beauty","Beauty & personal care"],["electronics","Electronics / computers"],
  ["home","Home & kitchen"],["clothing","Clothing & accessories"],["toys","Toys"],["books","Books"],["automotive","Automotive"]
] as const;
const takealotRates: Record<string,number> = {general:12,beauty:13,electronics:10,home:13,clothing:18,toys:12,books:14,automotive:10};
function takealotFulfilment(category:string, volume:number, kg:number) {
  const size = volume <= 35000 ? "standard" : volume <= 130000 ? "large" : volume <= 200000 ? "oversize" : volume <= 545000 ? "bulky" : "extra bulky";
  const band = kg <= 7 ? 0 : kg <= 25 ? 1 : kg <= 40 ? 2 : 3;
  const rates: Record<string,number[]> = {
    standard: category==="beauty" ? [33,52,107,107] : category==="electronics" ? [60,60,107,107] : [45,60,107,107],
    large:[60,65,107,118], oversize:[107,130,160,160], bulky:[107,145,160,172], "extra bulky":[270,270,320,390]
  };
  return {fee:rates[size][band],size};
}
export default function PriceCheckerPage() {
  const [mode,setMode]=useState<Mode>("name");
  const [query,setQuery]=useState("");
  const [barcode,setBarcode]=useState("");
  const [photoText,setPhotoText]=useState("");
  const [photoName,setPhotoName]=useState("");
  const [cost,setCost]=useState("");
  const [marketplaces,setMarketplaces]=useState<("takealot"|"amazon")[]>(["takealot","amazon"]);
  const [category,setCategory]=useState("general");
  const [weight,setWeight]=useState("0.5");
  const [length,setLength]=useState("20");
  const [width,setWidth]=useState("15");
  const [height,setHeight]=useState("10");
  const [products,setProducts]=useState<MarketplaceProduct[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [source,setSource]=useState("");
  const [photoBusy,setPhotoBusy]=useState(false);
  const [barcodeProduct,setBarcodeProduct]=useState("");
  const [barcodeBusy,setBarcodeBusy]=useState(false);
  const [scannerOpen,setScannerOpen]=useState(false);
  const [scanMessage,setScanMessage]=useState("");
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const scanTimerRef=useRef<number|null>(null);
  const getSupabaseHeaders=()=>{const session=typeof window!=="undefined"?localStorage.getItem("ekhaya_session"):null;const token=session?JSON.parse(session).access_token:null;return {"Content-Type":"application/json","apikey":"sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t","Authorization":token?`Bearer ${token}`:"Bearer"};};
  const buying=Number(cost);
  const validCost=cost.trim()!=="" && Number.isFinite(buying) && buying>0;
  const productQuery=mode==="barcode"?barcodeProduct.trim():mode==="photo"?photoText.trim():query.trim();
  const volume=Math.max(0,Number(length)||0)*Math.max(0,Number(width)||0)*Math.max(0,Number(height)||0);
  const kg=Math.max(0,Number(weight)||0);

  useEffect(()=>()=>{if(scanTimerRef.current!==null)window.clearInterval(scanTimerRef.current);streamRef.current?.getTracks().forEach(t=>t.stop());},[]);
  async function startScanner(){
    setScanMessage("");
    const Detector=(window as any).BarcodeDetector;
    if(!Detector){setScanMessage("Camera barcode scanning is not supported. Enter the barcode manually.");return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
      streamRef.current=stream;setScannerOpen(true);
      window.setTimeout(async()=>{
        const video=videoRef.current;if(!video)return;
        video.srcObject=stream;await video.play();
        const detector=new Detector({formats:["ean_13","ean_8","upc_a","upc_e","code_128"]});
        scanTimerRef.current=window.setInterval(async()=>{
          try{
            const hits=await detector.detect(video);
            if(hits.length&&hits[0].rawValue){
              const found=hits[0].rawValue;
              if(scanTimerRef.current!==null)window.clearInterval(scanTimerRef.current);
              scanTimerRef.current=null;stream.getTracks().forEach(t=>t.stop());streamRef.current=null;
              setScannerOpen(false);setBarcode(found);await identifyBarcode(found);
            }
          }catch{}
        },300);
      },150);
    }catch{setScanMessage("Camera access was blocked. Allow permission or enter the barcode manually.");}
  }
  function stopScanner(){
    if(scanTimerRef.current!==null)window.clearInterval(scanTimerRef.current);
    scanTimerRef.current=null;streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setScannerOpen(false);
  }
  async function identifyBarcode(value:string) {
    if(!/^\d{8,14}$/.test(value.trim())){setError("Enter a valid 8–14 digit barcode.");return;}
    setBarcodeBusy(true);setError("");setBarcodeProduct("");
    try {
      const response=await fetch("https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/product-identify",{method:"POST",headers:getSupabaseHeaders(),body:JSON.stringify({mode:"barcode",barcode:value.trim()})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error??"Barcode lookup failed");
      setBarcodeProduct(payload.product.brand?payload.product.brand+" "+payload.product.title:payload.product.title);
      if(payload.product.weight_grams)setWeight(String(payload.product.weight_grams/1000));
    } catch(e){setError(e instanceof Error?e.message:"Barcode lookup failed");}
    finally{setBarcodeBusy(false);}
  }
  async function search() {
    if(!validCost){setError("Enter your buying price first. This is required before searching.");return;}
    if(mode==="barcode"&&!barcodeProduct){setError("Identify the barcode first.");return;}
    if(productQuery.length<2){setError("Enter at least 2 characters to search.");return;}
    if(!marketplaces.length){setError("Choose at least one marketplace.");return;}
    setLoading(true);setError("");setProducts([]);setSource("");
    const errors:string[]=[]; let done=0;
    await Promise.all(marketplaces.map(async marketplace=>{
      try{
        const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),10000);
        const response=await fetch("https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/marketplace-search",{
          method:"POST",headers:getSupabaseHeaders(),
          body:JSON.stringify({marketplace,query:productQuery}),signal:controller.signal
        }).finally(()=>window.clearTimeout(timer));
        const payload=await response.json();if(!response.ok)throw new Error(payload.error??"Search failed");
        const incoming=(payload.products??[]).map((p:MarketplaceProduct)=>({...p,marketplace}));
        setProducts(old=>[...old.filter(p=>p.marketplace!==marketplace),...incoming]);
        setSource(old=>old==="Shared cache"&&payload.source!=="cache"?"Live marketplace data":payload.source==="cache"?"Shared cache":"Live marketplace data");
      }catch(e){errors.push((marketplace==="amazon"?"Amazon SA":"Takealot")+": "+(e instanceof Error?e.message:"Search failed"));setError(errors.join(" · "));}
      finally{done++;if(done===marketplaces.length)setLoading(false);}
    }));
  }
  async function readPhoto(file?:File) {
    if(!file)return;
    if(file.size>18*1024*1024){setError("Choose an image smaller than 18 MB.");return;}
    setPhotoName(file.name);setPhotoText("");setPhotoBusy(true);setError("");
    try {
      const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]??"");reader.onerror=()=>reject(new Error("Could not read image"));reader.readAsDataURL(file);});
      const response=await fetch("https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/product-identify",{method:"POST",headers:getSupabaseHeaders(),body:JSON.stringify({mode:"photo",file_b64:base64,filename:file.name})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error??"Photo recognition failed");
      setPhotoText(payload.text??"");if(!payload.text)setError("No clear text found. Enter the product brand or model manually.");
    } catch(e){setError(e instanceof Error?e.message:"Photo recognition failed");}
    finally{setPhotoBusy(false);}
  }
  const calculations=useMemo(()=>{
    return products.map(p=>{
      const price=Number(p.price)||0;
      const tal=takealotFulfilment(category,volume,kg);
      const success=price*(takealotRates[category]??12)/100;
      const talFees=(success+tal.fee)*1.15;
      const amazonReferral=price*.05;
      const amazonFba=category==="clothing"? (kg<=.25?27:kg<=.5?28:kg<=1?29:kg<=2?31:kg<=5?34:kg<=10?41:kg<=20?46:87):0;
      const amzFees=(amazonReferral+amazonFba)*1.15;
      const fee=p.marketplace==="takealot"?talFees:amzFees;
      const profit=price-buying-fee;
      return {id:p.id,fee,profit,margin:price?profit/price*100:0,fulfilment:p.marketplace==="takealot"?tal.fee:amazonFba,success:p.marketplace==="takealot"?success:amazonReferral,size:tal.size};
    });
  },[products,buying,category,volume,kg]);
  return <main className="page">
    <header className="top"><Link href="/" aria-label="Ekhaya Technologies home"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={230} height={190} className="logo" priority/></Link><span className="pill">PRICE INTELLIGENCE · LIVE RESEARCH</span><Link href="/account/" className="pill">SELLER ACCOUNT</Link></header>
    <section className="hero"><p className="eyebrow">SELL SMARTER. PRICE WITH CONFIDENCE.</p><h1>Know your numbers<br/><em>before you buy.</em></h1><p>Find a product, enter your buying price and compare estimated profit after marketplace fulfilment fees.</p></section>
    <section className="panel">
      <div className="heading"><div><small>01 / FIND A PRODUCT</small><h2>How would you like to search?</h2></div><span className="connected">● MARKETPLACE DATA</span></div>
      <div className="modes">{(["barcode","photo","name"] as Mode[]).map(m=><button key={m} className={mode===m?"active":""} onClick={()=>{setMode(m);setError("");}}>{m==="barcode"?"▦ Scan barcode":m==="photo"?"▧ Take a picture":"⌕ Search by name"}</button>)}</div>
      {mode==="name"&&<input className="wide" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Product name, brand or model (e.g. Logitech M171)"/>}
      {mode==="barcode"&&<div className="stack"><button type="button" className="secondary" onClick={startScanner}>Open camera barcode scanner</button>{scannerOpen&&<div className="scanner"><video ref={videoRef} playsInline muted/><button type="button" onClick={stopScanner}>Stop scanner</button></div>}{scanMessage&&<p className="hint">{scanMessage}</p>}<input className="wide" value={barcode} onChange={e=>{setBarcode(e.target.value);setBarcodeProduct("");}} placeholder="Enter barcode / EAN / UPC"/><button type="button" className="secondary" disabled={barcodeBusy||!barcode.trim()} onClick={()=>identifyBarcode(barcode)}>{barcodeBusy?"Looking up barcode…":"Identify barcode"}</button>{barcodeProduct&&<p className="hint">Identified product: <b>{barcodeProduct}</b></p>}</div>}
      {mode==="photo"&&<div className="stack"><label className="upload"> <input type="file" accept="image/*" capture="environment" onChange={e=>readPhoto(e.target.files?.[0])}/>Take or upload a product photo</label>{photoName&&<p className="hint">Selected: {photoName}</p>}{photoBusy&&<p className="hint">Reading text from image…</p>}<textarea className="wide photo-text" value={photoText} onChange={e=>setPhotoText(e.target.value)} placeholder="Detected text appears here. Edit it before searching."/></div>}
      <div className="buying"><label htmlFor="buying">Your buying price <b>Required</b></label><div className="money-input"><span>R</span><input id="buying" type="number" min="0.01" step="0.01" value={cost} onChange={e=>setCost(e.target.value)} placeholder="Enter supplier / purchase price"/></div></div>
      <div className="market-choice"><label>Compare marketplaces</label><div className="checks">{(["takealot","amazon"] as const).map(m=><label key={m}><input type="checkbox" checked={marketplaces.includes(m)} onChange={e=>setMarketplaces(old=>e.target.checked?[...old,m]:old.filter(x=>x!==m))}/>{m==="takealot"?"Takealot":"Amazon South Africa"}</label>)}</div></div>
      <div className="details"><div><label>Product category</label><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div><div><label>Packed weight (kg)</label><input type="number" min="0" step=".01" value={weight} onChange={e=>setWeight(e.target.value)}/></div><div><label>Length (cm)</label><input type="number" min="0" value={length} onChange={e=>setLength(e.target.value)}/></div><div><label>Width (cm)</label><input type="number" min="0" value={width} onChange={e=>setWidth(e.target.value)}/></div><div><label>Height (cm)</label><input type="number" min="0" value={height} onChange={e=>setHeight(e.target.value)}/></div></div>
      <p className="hint">Fulfilment assumption: you send inventory to the marketplace fulfilment centre. The marketplace stores, picks, packs and delivers each customer order.</p>
      <button className="search" disabled={loading||!validCost||!marketplaces.length||(mode==="barcode"&&!barcodeProduct)} onClick={search}>{loading?"Searching marketplaces…":"Find product & calculate profit →"}</button>
      {!validCost&&<p className="hint">Enter a buying price greater than R0 to unlock product search.</p>}
      {error&&<p className="error" role="status">{error}</p>}{source&&<p className="hint">{source} · Listing prices may change.</p>}
    </section>
    {products.length>0&&<section className="results"><div className="heading"><div><small>02 / COMPARE YOUR OPTIONS</small><h2>Product profitability</h2></div><span className="hint">Buying price: {money(buying)}</span></div><div className="cards">{products.map((p,i)=>{const c=calculations.find(x=>x.id===p.id);return <article className="product" key={p.marketplace+"-"+p.id+"-"+i}>{p.image?<img src={p.image} alt=""/>:<div className="placeholder">E</div>}<div className="info"><span className="market">{p.marketplace==="amazon"?"AMAZON SOUTH AFRICA":"TAKEALOT"}</span><strong>{p.title}</strong><small>{p.brand??"Marketplace listing"} · {p.in_stock===true?"In stock":p.in_stock===false?"Unavailable":"Stock unconfirmed"}</small><b className="price">{p.price==null?"Price unavailable":money(Number(p.price))}</b>{c&&p.price!=null&&<div className="breakdown"><div><span>Marketplace selling fee</span><b>{money(c.success)}</b></div><div><span>Fulfilment estimate</span><b>{c.fulfilment===0?"R0.00*":money(c.fulfilment)}</b></div><div><span>Estimated fees incl. VAT</span><b>{money(c.fee)}</b></div><div className="profit"><span>Estimated profit</span><b className={c.profit>=0?"good":"bad"}>{money(c.profit)}</b></div><div><span>Profit margin</span><b>{c.margin.toFixed(1)}%</b></div></div>}{p.url&&<a href={p.url} target="_blank" rel="noreferrer">View marketplace listing ↗</a>}</div></article>})}</div><p className="disclaimer">Estimates only. Takealot success and fulfilment fees vary by category, packed size and weight. Amazon FBA fulfilment fees may be waived under its current promotion for eligible products; apparel and other exceptions can apply. Figures exclude storage, inbound delivery to the fulfilment centre, returns, subscription allocation and other account-specific charges. *R0 reflects the published Amazon FBA promotion, not a permanent fee.</p></section>}
    <footer>DIGITAL SOLUTIONS · BUILT FOR SOUTH AFRICAN SELLERS <span>EKHAYA TECHNOLOGIES © 2026</span></footer>
    <style jsx>{`
      .page{min-height:100vh;background:#F4F8FC;color:#071B31;padding:0 5.5%;font-family:Arial,sans-serif}.top{height:78px;border-bottom:1px solid #DCE8F1;display:flex;align-items:center;justify-content:space-between}.logo{width:154px;height:auto}.pill{font-size:9px;letter-spacing:1.3px;color:#60758A;border:1px solid #DCE8F1;padding:9px 13px;border-radius:30px}.hero{text-align:center;max-width:720px;margin:58px auto 34px}.eyebrow,small{color:#079BD3;font-size:10px;font-weight:700;letter-spacing:1.7px}.hero h1{font-size:clamp(40px,6vw,66px);font-weight:400;line-height:1.03;letter-spacing:-2px;margin:16px 0}.hero h1 em{color:#079BD3}.hero p:last-child{color:#60758A;line-height:1.6;font-size:14px}.panel,.results{max-width:1040px;margin:0 auto 22px;background:#fff;border:1px solid #DCE8F1;border-radius:14px;padding:28px;box-shadow:0 8px 30px #071b3108}.heading{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.heading h2{font:400 25px Georgia,serif;margin:7px 0}.connected{font-size:9px;color:#079BD3}.modes{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:14px}.modes button{background:#F4F8FC;border:1px solid #DCE8F1;border-radius:8px;padding:14px 8px;color:#304B63;font-weight:700;cursor:pointer}.modes button.active{background:#E4F5FB;border-color:#079BD3;color:#056F9A}.wide,.details input,.details select{box-sizing:border-box;width:100%;height:45px;border:1px solid #DCE8F1;border-radius:7px;padding:0 12px;background:#fff;color:#071B31;font-size:14px}.buying{margin-top:22px}.buying>label,.market-choice>label,.details label{display:block;font-size:12px;font-weight:700;color:#304B63;margin-bottom:8px}.buying>label b{color:#B42318;font-size:10px;margin-left:8px}.money-input{display:flex;align-items:center;border:1px solid #079BD3;border-radius:8px;height:52px;padding:0 13px}.money-input span{font-weight:700;color:#60758A}.money-input input{border:0;outline:0;width:100%;height:100%;padding-left:10px;font-size:18px;color:#071B31}.market-choice{margin:20px 0}.checks{display:flex;gap:22px;flex-wrap:wrap}.checks label{font-size:13px;display:flex;gap:8px;align-items:center;color:#304B63}.checks input{accent-color:#079BD3}.details{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.details label{font-size:11px}.hint{font-size:11px;color:#71869A;line-height:1.5}.search{width:100%;height:49px;border:0;border-radius:8px;background:#079BD3;color:white;font-weight:700;margin-top:13px;cursor:pointer}.search:disabled{opacity:.45;cursor:not-allowed}.error{color:#B42318;font-size:12px}.stack{display:grid;gap:9px}.upload{display:block;text-align:center;padding:16px;border:1px dashed #079BD3;border-radius:8px;color:#056F9A;font-weight:700;cursor:pointer}.upload input{display:none}.scanner{display:grid;gap:8px}.scanner video{width:100%;max-height:250px;object-fit:cover;border-radius:8px;background:#071B31}.scanner button{height:38px;border:0;border-radius:7px;background:#071B31;color:#fff}.secondary{height:42px;border:1px solid #079BD3;border-radius:8px;background:#E4F5FB;color:#056F9A;font-weight:700}.photo-text{min-height:100px;padding:12px;resize:vertical}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px}.product{display:flex;gap:13px;border:1px solid #DCE8F1;border-radius:10px;padding:14px;min-width:0}.product>img,.placeholder{width:82px;height:82px;object-fit:contain;flex:0 0 82px;background:#F4F8FC;border-radius:7px}.placeholder{display:grid;place-items:center;color:#079BD3;font-size:26px;font-weight:bold}.info{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:6px;flex:1}.info strong{font-size:12px;line-height:1.4}.info small{font-size:10px;color:#71869A;letter-spacing:0;font-weight:400}.market{font-size:9px;color:#079BD3;font-weight:bold;letter-spacing:1px}.price{font-size:18px}.breakdown{width:100%;border-top:1px solid #DCE8F1;margin-top:6px;padding-top:7px}.breakdown div{display:flex;justify-content:space-between;gap:8px;padding:5px 0;font-size:10px;color:#60758A}.breakdown b{color:#071B31;white-space:nowrap}.breakdown .profit{border-top:1px solid #DCE8F1;margin-top:4px;padding-top:9px;font-size:12px;font-weight:bold}.good{color:#07865B!important}.bad{color:#B42318!important}.info a{font-size:10px;color:#079BD3;font-weight:bold;margin-top:5px}.disclaimer{font-size:10px;line-height:1.6;color:#71869A;margin-top:18px}footer{max-width:1040px;margin:35px auto 0;padding:20px 0 28px;border-top:1px solid #DCE8F1;display:flex;justify-content:space-between;color:#8195A8;font-size:9px;letter-spacing:1px}
      @media(max-width:760px){.page{padding:0 5%}.hero{margin:42px auto 28px}.panel,.results{padding:20px}.details{grid-template-columns:repeat(2,1fr)}.modes{grid-template-columns:1fr}.heading{gap:10px}.connected{font-size:8px}footer{flex-direction:column;gap:10px;text-align:center}}
    `}</style>
  </main>;
}
