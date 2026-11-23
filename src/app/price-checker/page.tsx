"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BrowserMultiFormatReader } from "@zxing/browser";

type MarketplaceProduct = { marketplace?: string; id: string; title: string; brand?: string | null; price: number | null; original_price?: number | null; discount_percent?: number | null; pack_size?: string | null; sold_by_makro?: boolean | null; availability?: string | null; key_specs?: string[]; currency: string; image?: string | null; url?: string | null; in_stock?: boolean | null; rating?: number | null; review_count?: number | null; seller?: string | null; relevance_score?: number; match_classification?: string; result_group?: string; condition_label?: string; };
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
  const [marketplaces,setMarketplaces]=useState<("takealot"|"amazon"|"makro")[]>(["takealot"]);
  const [postalCode,setPostalCode]=useState("");
  const [category,setCategory]=useState("general");
  const [weight,setWeight]=useState("0.5");
  const [length,setLength]=useState("20");
  const [width,setWidth]=useState("15");
  const [height,setHeight]=useState("10");
  const [takealotMode,setTakealotMode]=useState<"marketplace"|"seller">("marketplace");
  const [amazonMode,setAmazonMode]=useState<"fba"|"easy"|"self">("fba");
  const [sellerDelivery,setSellerDelivery]=useState("0");
  const [makroFulfilment,setMakroFulfilment]=useState<"fbs"|"fbm">("fbs");
  const [makroCommission,setMakroCommission]=useState("12");
  const [products,setProducts]=useState<MarketplaceProduct[]>([]);
  const [relatedProducts,setRelatedProducts]=useState<MarketplaceProduct[]>([]);
  const [accessories,setAccessories]=useState<MarketplaceProduct[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [source,setSource]=useState("");
  const [photoBusy,setPhotoBusy]=useState(false);
  const [barcodeProduct,setBarcodeProduct]=useState("");
  const [barcodeBusy,setBarcodeBusy]=useState(false);
  const [photoSearchAllowed,setPhotoSearchAllowed]=useState(false);
  const [photoEntitlementLoading,setPhotoEntitlementLoading]=useState(true);

  useEffect(()=>{
    let active=true;
    async function loadPhotoEntitlement(){
      try{
        const raw=localStorage.getItem("ekhaya_session");
        const session=raw?JSON.parse(raw) as {access_token?:string}:null;
        if(!session?.access_token) return;
        const response=await fetch("https://itxxnhcjjiynrmivexcb.supabase.co/rest/v1/profiles?select=plan_code&id=eq."+encodeURIComponent(String((session as {user?:{id?:string}}).user?.id??"")),{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"","Authorization":"Bearer "+session.access_token},cache:"no-store"});
        if(!response.ok) return;
        const rows=await response.json();
        const plan=String(rows?.[0]?.plan_code??"beginner").toLowerCase();
        if(active) setPhotoSearchAllowed(plan!=="beginner" && plan!=="free");
      }catch{ if(active) setPhotoSearchAllowed(false); }
      finally{ if(active) setPhotoEntitlementLoading(false); }
    }
    void loadPhotoEntitlement();
    return ()=>{active=false;};
  },[]);

  type SellerSession = { access_token?: string; refresh_token?: string; expires_at?: number; expires_in?: number; [key: string]: unknown };
  const getSupabaseHeaders=async(forceRefresh=false)=>{
    if(typeof window==="undefined")throw new Error("Sign in to your Ekhaya seller account before searching.");
    const storageKey="ekhaya_session";
    let session:SellerSession|null=null;
    try{
      const raw=localStorage.getItem(storageKey);
      session=raw?JSON.parse(raw) as SellerSession:null;
    }catch{
      localStorage.removeItem(storageKey);
      throw new Error("Your seller session could not be read. Please sign in again.");
    }
    if(!session?.access_token||!session?.refresh_token){
      localStorage.removeItem(storageKey);
      throw new Error("Please sign in to your Ekhaya seller account before searching.");
    }
    const expiresAt=Number(session.expires_at)||0;
    if(!forceRefresh&&expiresAt>Date.now()/1000+60){
      return {"Content-Type":"application/json","apikey":process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"","Authorization":`Bearer ${session.access_token}`};
    }
    const refreshed=await fetch("https://itxxnhcjjiynrmivexcb.supabase.co/auth/v1/token?grant_type=refresh_token",{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??""},
      body:JSON.stringify({refresh_token:session.refresh_token})
    });
    const payload=await refreshed.json().catch(()=>({})) as Record<string, unknown>;
    if(!refreshed.ok||typeof payload.access_token!=="string"||typeof payload.refresh_token!=="string"){
      localStorage.removeItem(storageKey);
      throw new Error("Your seller sign-in has expired. Please sign in again.");
    }
    const refreshedSession:SellerSession={...(session??{}),...payload,expires_at:Math.floor(Date.now()/1000)+Number(payload.expires_in??3600)};
    localStorage.setItem(storageKey,JSON.stringify(refreshedSession));
    return {"Content-Type":"application/json","apikey":process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"","Authorization":`Bearer ${payload.access_token}`};
  };
  const buying=Number(cost);
  const validCost=cost.trim()!=="" && Number.isFinite(buying) && buying>0;
  const productQuery=mode==="barcode"?barcodeProduct.trim():mode==="photo"?photoText.trim():query.trim();
  const volume=Math.max(0,Number(length)||0)*Math.max(0,Number(width)||0)*Math.max(0,Number(height)||0);
  const kg=Math.max(0,Number(weight)||0);

  async function identifyBarcode(value:string) {
    if(!/^\d{8,14}$/.test(value.trim())){setError("Enter a valid 8–14 digit barcode.");return;}
    setBarcodeBusy(true);setError("");setBarcodeProduct("");
    try {
      const response=await fetch("https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/product-identify",{method:"POST",headers:await getSupabaseHeaders(),body:JSON.stringify({mode:"barcode",barcode:value.trim()})});
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
    setLoading(true);setError("");setProducts([]);setRelatedProducts([]);setAccessories([]);setSource("");
    let authHeaders:Record<string,string>;
    try{authHeaders=await getSupabaseHeaders();}
    catch(e){setError(e instanceof Error?e.message:"Please sign in to your Ekhaya seller account.");setLoading(false);return;}
    const errors:string[]=[]; let done=0;
    await Promise.all(marketplaces.map(async marketplace=>{
      try{
        const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),20000);
        const response=await fetch("https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/marketplace-search",{
          method:"POST",headers:authHeaders,
          body:JSON.stringify({marketplace,query:productQuery,request_id:crypto.randomUUID(),...(marketplace==="makro"&&postalCode.trim()?{postal_code:postalCode.trim()}: {})}),signal:controller.signal
        }).finally(()=>window.clearTimeout(timer));
        const payload=await response.json();if(!response.ok)throw new Error(payload.error??"Search failed");
        const dedupe=(items:MarketplaceProduct[])=>{
          const seen=new Set<string>();
          return items.filter(item=>{
            const title=(item.title??"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
            const key=[item.marketplace,title,Number(item.price)||0].join("|");
            if(seen.has(key))return false;
            seen.add(key);return true;
          });
        };
        const incoming=dedupe((payload.products??[]).map((p:MarketplaceProduct)=>({...p,marketplace})));
        const related=dedupe((payload.related_products??[]).map((p:MarketplaceProduct)=>({...p,marketplace})));
        const accessory=dedupe((payload.accessories??[]).map((p:MarketplaceProduct)=>({...p,marketplace})));
        setProducts(old=>[...old.filter(p=>p.marketplace!==marketplace),...incoming]);
        setRelatedProducts(old=>[...old.filter(p=>p.marketplace!==marketplace),...related]);
        setAccessories(old=>[...old.filter(p=>p.marketplace!==marketplace),...accessory]);
        setSource(payload.source==="cache"?"Shared cache":payload.source==="stale-cache"?"Stale shared cache — prices may be outdated":"Live marketplace data");
        if(incoming.length===0&&related.length===0&&accessory.length===0)setError("We couldn’t find a relevant match. Try a more specific brand or model number. No search credit was used.");
      }catch(e){errors.push((marketplace==="amazon"?"Amazon SA":marketplace==="makro"?"Makro":"Takealot")+": "+(e instanceof Error?e.message:"Search failed"));setError(errors.join(" · "));}
      finally{done++;if(done===marketplaces.length)setLoading(false);}
    }));
  }
  async function readPhoto(file?:File) {
    if(!file)return;
    if(!photoSearchAllowed){setError("Photograph search is not included in the Beginner plan. Upgrade to Starter or above.");return;}
    if(file.size>18*1024*1024){setError("Choose an image smaller than 18 MB.");return;}
    setPhotoName(file.name);setPhotoText("");setPhotoBusy(true);setError("");
    try {
      const objectUrl=URL.createObjectURL(file);
      try {
        const result=await new BrowserMultiFormatReader().decodeFromImageUrl(objectUrl);
        const detected=result.getText().trim();
        if(/^\d{8,14}$/.test(detected)){
          setBarcode(detected);setMode("barcode");
          await identifyBarcode(detected);
          setError("");
          return;
        }
      } catch { /* No readable barcode: continue with text recognition. */ }
      finally { URL.revokeObjectURL(objectUrl); }
      const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]??"");reader.onerror=()=>reject(new Error("Could not read image"));reader.readAsDataURL(file);});
      const response=await fetch("https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/product-identify",{method:"POST",headers:await getSupabaseHeaders(),body:JSON.stringify({mode:"photo",file_b64:base64,filename:file.name})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error??"Photo recognition failed");
      setPhotoText(payload.text??"");
      if(!payload.text)setError("No readable barcode or product text found. Enter the barcode or product name manually.");
      else setError("No barcode detected. Check the recognised text and search by product name.");
    } catch(e){setError(e instanceof Error?e.message:"Photo recognition failed");}
    finally{setPhotoBusy(false);}
  }
  const calculations=useMemo(()=>{
    return [...products,...relatedProducts,...accessories].map(p=>{
      const price=Number(p.price)||0;
      const tal=takealotFulfilment(category,volume,kg);
      const success=price*(takealotRates[category]??12)/100;
      const talFulfilment=takealotMode==="marketplace"?tal.fee:(Number(sellerDelivery)||0);
      const talFees=(success+talFulfilment)*1.15;
      const amazonReferral=price*.05;
      const amazonFba=category==="clothing"? (kg<=.25?27:kg<=.5?28:kg<=1?29:kg<=2?31:kg<=5?34:kg<=10?41:kg<=20?46:87):0;
      const amzFulfilment=amazonMode==="fba"?amazonFba:amazonMode==="easy"?Number(sellerDelivery)||0:Number(sellerDelivery)||0;
      const amzFees=(amazonReferral+amzFulfilment)*1.15;
      if(p.marketplace==="makro") {
        const rate=Math.max(0,Math.min(30,Number(makroCommission)||12))/100;
        const commission=price*rate*1.15;
        const transportBase=makroFulfilment==="fbs"?(volume<=15000?(kg<=4.99?41:kg<=14.99?53:120):volume<=30000?(kg<=4.99?54:kg<=14.99?72:120):volume<=60000?(kg<=4.99?62:kg<=14.99?77:132):84):(volume<=15000?(kg<=4.99?34:kg<=14.99?44:100):volume<=30000?(kg<=4.99?45:kg<=14.99?60:100):volume<=60000?(kg<=4.99?52:kg<=14.99?64:110):70);
        const transport=transportBase*1.15;
        const fee=commission+transport;
        const profit=price-buying-fee;
        return {id:p.id,fee,profit,margin:price?profit/price*100:0,fulfilment:transport,success:commission,size:"Makro estimate"};
      }
      const fee=p.marketplace==="takealot"?talFees:amzFees;
      const profit=price-buying-fee;
      return {id:p.id,fee,profit,margin:price?profit/price*100:0,fulfilment:p.marketplace==="takealot"?talFulfilment:amzFulfilment,success:p.marketplace==="takealot"?success:amazonReferral,size:tal.size};
    });
  },[products,relatedProducts,accessories,buying,category,volume,kg,takealotMode,amazonMode,sellerDelivery,makroFulfilment,makroCommission]);
  const renderProductCard=(p:MarketplaceProduct,i:number,allCalculations:typeof calculations)=>{
    const c=allCalculations.find(x=>x?.id===p.id);
    const marketplace=p.marketplace==="amazon"?"Amazon South Africa":p.marketplace==="makro"?"Makro Marketplace":"Takealot";
    const classification=p.match_classification??"Marketplace listing";
    return <article className="product" key={p.marketplace+"-"+p.id+"-"+i}>
      <div className="product-media">{p.image?<Image src={p.image} alt={p.title} width={180} height={180} unoptimized/>:<div className="placeholder">E</div>}</div>
      <div className="info">
        <div className="product-topline"><span className="market">{marketplace}</span><span className={"match-badge "+(classification.toLowerCase().includes("exact")?"match-exact":"")}>{classification}</span></div>
        <h4>{p.title}</h4>
        <div className="product-meta"><span>{p.condition_label??"Condition not stated"}</span><span>{p.brand??"Brand not confirmed"}</span><span className={p.in_stock===true?"stock-in":p.in_stock===false?"stock-out":"stock-unknown"}>{p.in_stock===true?"In stock":p.in_stock===false?"Unavailable":"Stock unconfirmed"}</span></div>
        {p.relevance_score!==undefined&&<div className="relevance"><span>Match relevance</span><b>{p.relevance_score}/100</b></div>}
        <div className="price-row"><div><span className="eyebrow-label">Marketplace price</span><b className="price">{p.price==null?"Price unavailable":money(Number(p.price))}</b>{p.marketplace==="makro"&&p.original_price!=null&&<small className="was-price">Was {money(Number(p.original_price))}</small>}</div>{p.url&&<a className="listing-link" href={p.url} target="_blank" rel="noreferrer">View listing <span>↗</span></a>}</div>
        {c&&p.price!=null&&<div className="finance-panel">
          <div className="profit-highlight"><span>Estimated profit</span><b className={c.profit>=0?"good":"bad"}>{money(c.profit)}</b><small>{c.margin.toFixed(1)}% margin</small></div>
          <div className="fee-grid"><div><span>Marketplace fee</span><b>{money(c.success)}</b></div><div><span>Fulfilment</span><b>{money(c.fulfilment)}</b></div><div><span>Total fees incl. VAT</span><b>{money(c.fee)}</b></div></div>
        </div>}
      </div>
    </article>;
  };
  return <main className="page">
    <header className="top"><Link href="/" aria-label="Ekhaya Technologies home"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={230} height={190} className="logo" priority/></Link><span className="pill">PRICE INTELLIGENCE · LIVE RESEARCH</span><Link href="/account/" className="pill">SELLER ACCOUNT</Link></header>
    <section className="hero"><p className="eyebrow">SELL SMARTER. PRICE WITH CONFIDENCE.</p><h1>Know your numbers<br/><em>before you buy.</em></h1><p>Find a product, enter your buying price and compare estimated profit after marketplace fulfilment fees.</p></section>
    <section className="panel">
      <div className="heading"><div><small>01 / FIND A PRODUCT</small><h2>How would you like to search?</h2></div><span className="connected">● MARKETPLACE DATA</span></div>
      <div className="modes">{(["barcode","photo","name"] as Mode[]).filter(m=>m!=="photo"||photoSearchAllowed).map(m=><button key={m} className={mode===m?"active":""} onClick={()=>{setMode(m);setError("");}}>{m==="barcode"?"▦ Enter barcode":m==="photo"?"▧ Take a picture":"⌕ Search by name"}</button>)}</div>{!photoSearchAllowed&&!photoEntitlementLoading&&<p className="hint" role="note">Photograph search is available on Starter, Growth and Pro plans. Upgrade your plan to unlock it.</p>}{photoEntitlementLoading&&<p className="hint">Checking photograph search access…</p>}
      {mode==="name"&&<input className="wide" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Product name, brand or model (e.g. Logitech M171)"/>}
      {mode==="barcode"&&<div className="stack"><input className="wide" inputMode="numeric" value={barcode} onChange={e=>{setBarcode(e.target.value.replace(/\D/g,"").slice(0,14));setBarcodeProduct("");setError("");}} placeholder="Enter barcode / EAN / UPC"/><button type="button" className="secondary" disabled={barcodeBusy||!barcode.trim()} onClick={()=>identifyBarcode(barcode)}>{barcodeBusy?"Looking up barcode…":"Identify barcode"}</button>{barcodeProduct&&<p className="hint">Identified product: <b>{barcodeProduct}</b></p>}<p className="hint">Enter the digits printed below the product barcode, or take a product photo and we’ll check it automatically.</p></div>}
      {mode==="photo"&&<div className="stack"><label className="upload"> <input type="file" accept="image/*" capture="environment" onChange={e=>readPhoto(e.target.files?.[0])}/>Take a product photo (barcode detection included)</label>{photoName&&<p className="hint">Selected: {photoName}</p>}{photoBusy&&<p className="hint">Checking image for barcode and product text…</p>}<textarea className="wide photo-text" value={photoText} onChange={e=>setPhotoText(e.target.value)} placeholder="If no barcode is found, recognised product text appears here. Edit it before searching by name."/></div>}
      <div className="buying"><label htmlFor="buying">Your buying price <b>Required</b></label><div className="money-input"><span>R</span><input id="buying" type="number" min="0.01" step="0.01" value={cost} onChange={e=>setCost(e.target.value)} placeholder="Enter supplier / purchase price"/></div></div>
      <div className="market-choice"><label id="marketplace-label">Compare marketplaces</label><details className="market-dropdown"><summary aria-labelledby="marketplace-label">{marketplaces.length ? marketplaces.map(m=>m==="takealot"?"Takealot":m==="amazon"?"Amazon South Africa":"Makro").join(", ") : "Select marketplaces"}<span>▾</span></summary><div className="market-options"><label><input type="checkbox" checked={marketplaces.includes("takealot")} onChange={e=>setMarketplaces(e.target.checked?[...marketplaces.filter(m=>m!=="takealot"),"takealot"]:marketplaces.filter(m=>m!=="takealot"))}/><span>Takealot</span><small className="available-status">Live</small></label><label><input type="checkbox" checked={marketplaces.includes("amazon")} onChange={e=>setMarketplaces(e.target.checked?[...marketplaces.filter(m=>m!=="amazon"),"amazon"]:marketplaces.filter(m=>m!=="amazon"))}/><span>Amazon South Africa</span><small className="available-status">Live</small></label><label><input type="checkbox" checked={marketplaces.includes("makro")} onChange={e=>setMarketplaces(e.target.checked?[...marketplaces.filter(m=>m!=="makro"),"makro"]:marketplaces.filter(m=>m!=="makro"))}/><span>Makro Marketplace</span><small className="available-status">Live</small></label><label className="disabled-option"><input type="checkbox" disabled/><span>Bobshop</span><small>Coming soon</small></label><label className="disabled-option"><input type="checkbox" disabled/><span>Leroy Merlin</span><small>Coming soon</small></label></div></details><p className="hint">Takealot, Amazon South Africa and Makro are live marketplaces. Each selected marketplace uses one Ekhaya search credit. Makro fees are indicative estimates based on published fee guidance and the dimensions/weight entered.</p>{marketplaces.includes("makro")&&<div style={{marginTop:12,maxWidth:260}}><label htmlFor="makro-postcode" className="hint">Makro delivery postal code (optional)</label><input id="makro-postcode" className="wide" inputMode="numeric" maxLength={4} value={postalCode} onChange={e=>setPostalCode(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="e.g. 0001"/></div>}</div>
      <div className="details"><div><label>Product category</label><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div><div><label>Packed weight (kg)</label><input type="number" min="0" step=".01" value={weight} onChange={e=>setWeight(e.target.value)}/></div><div><label>Length (cm)</label><input type="number" min="0" value={length} onChange={e=>setLength(e.target.value)}/></div><div><label>Width (cm)</label><input type="number" min="0" value={width} onChange={e=>setWidth(e.target.value)}/></div><div><label>Height (cm)</label><input type="number" min="0" value={height} onChange={e=>setHeight(e.target.value)}/></div></div>
      {marketplaces.includes("makro")&&<div className="details" style={{marginTop:14}}><div><label>Makro fulfilment</label><select value={makroFulfilment} onChange={e=>setMakroFulfilment(e.target.value as "fbs"|"fbm")}><option value="fbs">Fulfilled by Seller (FBS)</option><option value="fbm">Fulfilled by Makro (FBM)</option></select></div><div><label>Makro commission estimate (%)</label><input type="number" min="0" max="30" step=".5" value={makroCommission} onChange={e=>setMakroCommission(e.target.value)}/></div></div>}
      <div className="details" style={{marginTop:14}}><div><label>Takealot fulfilment</label><select value={takealotMode} onChange={e=>setTakealotMode(e.target.value as "marketplace"|"seller")}><option value="marketplace">Fulfilled by Takealot</option><option value="seller">Seller fulfilled</option></select></div><div><label>Amazon fulfilment</label><select value={amazonMode} onChange={e=>setAmazonMode(e.target.value as "fba"|"easy"|"self")}><option value="fba">FBA</option><option value="easy">Easy Ship</option><option value="self">Self Ship</option></select></div><div><label>Delivery cost (R/order)</label><input type="number" min="0" step=".01" value={sellerDelivery} onChange={e=>setSellerDelivery(e.target.value)}/></div></div><p className="hint">Fulfilment is selected separately for each marketplace. For Easy Ship and Self Ship, enter your own estimated delivery/handling cost per order. Takealot seller-fulfilled orders exclude Takealot fulfilment charges; enter your own delivery or handling cost above to include it in estimated profit.</p>
      <button className="search" disabled={loading||!validCost||!marketplaces.length||(mode==="barcode"&&!barcodeProduct)} onClick={search}>{loading?"Searching marketplaces…":"Find product & calculate profit →"}</button>
      {!validCost&&<p className="hint">Enter a buying price greater than R0 to unlock product search.</p>}
      {error&&<p className="error" role="status">{error}</p>}{source&&<p className="hint">{source} · Listing prices may change.</p>}
    </section>
    {(products.length>0||relatedProducts.length>0||accessories.length>0)&&<section className="results"><div className="heading"><div><small>02 / COMPARE YOUR OPTIONS</small><h2>Product profitability</h2></div><span className="hint">Buying price: {money(buying)}</span></div>
      {products.length===0&&relatedProducts.length>0&&<p className="hint">We couldn’t find an exact match. Here are the closest related products we found.</p>}
{products.length>0&&<><h3>Best product matches</h3><div className="cards">{products.map((p,i)=>renderProductCard(p,i,calculations))}</div></>}
{relatedProducts.length>0&&<><h3>Related products</h3><div className="cards">{relatedProducts.map((p,i)=>renderProductCard(p,i,calculations))}</div></>}
{accessories.length>0&&<><h3>Accessories — not complete products</h3><p className="hint">Accessories are separated from complete products and are never presented as exact matches.</p><div className="cards">{accessories.map((p,i)=>renderProductCard(p,i,calculations))}</div></>}
<p className="disclaimer">Indicative estimates only. Makro commission defaults to 12% (editable) and includes a 15% VAT allowance on the fee; transport uses the published small-to-large size/weight bands and selected FBS/FBM model. Actual category commission, package dimensions, weight, VAT status, returns and seller terms can change the result. The R230 monthly platform fee, FBM first-mile and storage charges are not allocated per product. Use Makro Seller Centre for the final fee schedule. Each marketplace search consumes one Ekhaya credit; searching all three consumes three credits.</p></section>}
    <footer>DIGITAL SOLUTIONS · BUILT FOR SOUTH AFRICAN SELLERS <span>EKHAYA TECHNOLOGIES © 2026</span></footer>
    <style jsx>{`
      .page{min-height:100vh;background:#F4F8FC;color:#071B31;padding:0 5.5%;font-family:Arial,sans-serif}.top{height:78px;border-bottom:1px solid #DCE8F1;display:flex;align-items:center;justify-content:space-between}.logo{width:154px;height:auto}.pill{font-size:9px;letter-spacing:1.3px;color:#60758A;border:1px solid #DCE8F1;padding:9px 13px;border-radius:30px}.hero{text-align:center;max-width:720px;margin:58px auto 34px}.eyebrow,small{color:#079BD3;font-size:10px;font-weight:700;letter-spacing:1.7px}.hero h1{font-size:clamp(40px,6vw,66px);font-weight:400;line-height:1.03;letter-spacing:-2px;margin:16px 0}.hero h1 em{color:#079BD3}.hero p:last-child{color:#60758A;line-height:1.6;font-size:14px}.panel,.results{max-width:1040px;margin:0 auto 22px;background:#fff;border:1px solid #DCE8F1;border-radius:14px;padding:28px;box-shadow:0 8px 30px #071b3108}.heading{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.heading h2{font:400 25px Georgia,serif;margin:7px 0}.connected{font-size:9px;color:#079BD3}.modes{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:14px}.modes button{background:#F4F8FC;border:1px solid #DCE8F1;border-radius:8px;padding:14px 8px;color:#304B63;font-weight:700;cursor:pointer}.modes button.active{background:#E4F5FB;border-color:#079BD3;color:#056F9A}.wide,.details input,.details select{box-sizing:border-box;width:100%;height:45px;border:1px solid #DCE8F1;border-radius:7px;padding:0 12px;background:#fff;color:#071B31;font-size:14px}.buying{margin-top:22px}.buying>label,.market-choice>label,.details label{display:block;font-size:12px;font-weight:700;color:#304B63;margin-bottom:8px}.buying>label b{color:#B42318;font-size:10px;margin-left:8px}.money-input{display:flex;align-items:center;border:1px solid #079BD3;border-radius:8px;height:52px;padding:0 13px}.money-input span{font-weight:700;color:#60758A}.money-input input{border:0;outline:0;width:100%;height:100%;padding-left:10px;font-size:18px;color:#071B31}.market-choice{margin:20px 0}.market-dropdown{position:relative;max-width:100%;z-index:2}.market-dropdown summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;box-sizing:border-box;padding:0 14px;border:1px solid #B9C9D7;border-radius:8px;background:#fff;color:#304B63;font-size:14px;cursor:pointer}.market-dropdown summary::-webkit-details-marker{display:none}.market-dropdown[open] summary{border-color:#079BD3;border-radius:8px 8px 0 0}.market-dropdown summary span{color:#079BD3;font-size:18px}.market-options{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #079BD3;border-top:0;border-radius:0 0 8px 8px;box-shadow:0 12px 24px #071b3118;padding:6px;display:grid;gap:2px}.market-options label{display:flex;align-items:center;gap:10px;padding:11px 9px;border-radius:6px;color:#304B63;font-size:13px;cursor:pointer}.market-options label:hover{background:#F4F8FC}.market-options input{accent-color:#079BD3;width:16px;height:16px}.market-options small{margin-left:auto;font-size:10px;letter-spacing:0;color:#07865B}.market-options .disabled-option{opacity:.55;cursor:not-allowed}.market-options .disabled-option small{color:#8A5A16}.details{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.details label{font-size:11px}.hint{font-size:11px;color:#71869A;line-height:1.5}.search{width:100%;height:49px;border:0;border-radius:8px;background:#079BD3;color:white;font-weight:700;margin-top:13px;cursor:pointer}.search:disabled{opacity:.45;cursor:not-allowed}.error{color:#B42318;font-size:12px}.stack{display:grid;gap:9px}.upload{display:block;text-align:center;padding:16px;border:1px dashed #079BD3;border-radius:8px;color:#056F9A;font-weight:700;cursor:pointer}.upload input{display:none}.scanner{display:grid;gap:8px}.scanner video{width:100%;max-height:250px;object-fit:cover;border-radius:8px;background:#071B31}.scanner button{height:38px;border:0;border-radius:7px;background:#071B31;color:#fff}.secondary{height:42px;border:1px solid #079BD3;border-radius:8px;background:#E4F5FB;color:#056F9A;font-weight:700}.photo-text{min-height:100px;padding:12px;resize:vertical}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px}.product{display:flex;gap:13px;border:1px solid #DCE8F1;border-radius:10px;padding:14px;min-width:0}.product>img,.placeholder{width:82px;height:82px;object-fit:contain;flex:0 0 82px;background:#F4F8FC;border-radius:7px}.placeholder{display:grid;place-items:center;color:#079BD3;font-size:26px;font-weight:bold}.info{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:6px;flex:1}.info strong{font-size:12px;line-height:1.4}.info small{font-size:10px;color:#71869A;letter-spacing:0;font-weight:400}.market{font-size:9px;color:#079BD3;font-weight:bold;letter-spacing:1px}.price{font-size:18px}.breakdown{width:100%;border-top:1px solid #DCE8F1;margin-top:6px;padding-top:7px}.breakdown div{display:flex;justify-content:space-between;gap:8px;padding:5px 0;font-size:10px;color:#60758A}.breakdown b{color:#071B31;white-space:nowrap}.breakdown .profit{border-top:1px solid #DCE8F1;margin-top:4px;padding-top:9px;font-size:12px;font-weight:bold}.good{color:#07865B!important}.bad{color:#B42318!important}.info a{font-size:10px;color:#079BD3;font-weight:bold;margin-top:5px}.disclaimer{font-size:10px;line-height:1.6;color:#71869A;margin-top:18px}footer{max-width:1040px;margin:35px auto 0;padding:20px 0 28px;border-top:1px solid #DCE8F1;display:flex;justify-content:space-between;color:#8195A8;font-size:9px;letter-spacing:1px}
      @media(max-width:760px){.page{padding:0 5%}.hero{margin:42px auto 28px}.panel,.results{padding:20px}.details{grid-template-columns:repeat(2,1fr)}.modes{grid-template-columns:1fr}.heading{gap:10px}.connected{font-size:8px}footer{flex-direction:column;gap:10px;text-align:center}}
    `}</style>
  </main>;
}      .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:18px;align-items:stretch}
      .product{display:grid;grid-template-columns:148px minmax(0,1fr);gap:18px;min-width:0;padding:18px;border:1px solid #E2EAF1;border-radius:14px;background:linear-gradient(180deg,#fff 0%,#FBFDFF 100%);box-shadow:0 5px 18px #071b3109;transition:box-shadow .18s ease,border-color .18s ease}
      .product:hover{border-color:#B8D8E8;box-shadow:0 10px 28px #071b3112}
      .product-media{height:160px;display:grid;place-items:center;overflow:hidden;border-radius:10px;background:#F5F8FB;border:1px solid #EDF2F6}
      .product-media img{width:100%;height:100%;object-fit:contain;padding:10px;box-sizing:border-box}
      .placeholder{display:grid;place-items:center;color:#079BD3;font-size:32px;font-weight:700}
      .info{min-width:0;display:flex;flex-direction:column;align-items:stretch;gap:10px}
      .product-topline{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
      .market{display:inline-flex;align-items:center;border-radius:20px;background:#EAF6FB;color:#087CA7;padding:6px 10px;font-size:9px;font-weight:800;letter-spacing:.8px}
      .match-badge{font-size:10px;font-weight:700;color:#536B80;background:#F0F3F6;border-radius:20px;padding:6px 9px}
      .match-badge.match-exact{background:#E8F7EF;color:#137548}
      .info h4{margin:0;color:#102A43;font-size:15px;line-height:1.4;font-weight:700;overflow-wrap:anywhere}
      .product-meta{display:flex;flex-wrap:wrap;gap:6px}
      .product-meta span{font-size:10px;color:#687F93;background:#F3F6F8;border-radius:5px;padding:5px 7px}
      .product-meta .stock-in{color:#137548;background:#E8F7EF}.product-meta .stock-out{color:#B42318;background:#FDECEC}
      .relevance{display:flex;justify-content:space-between;align-items:center;color:#71869A;font-size:10px}
      .relevance b{color:#304B63}
      .price-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid #E8EEF3;border-bottom:1px solid #E8EEF3}
      .eyebrow-label{display:block;color:#8193A3;font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:4px}
      .price{display:block;color:#102A43;font-size:23px;line-height:1.2;font-weight:800}
      .was-price{display:block;color:#8A9AAA;font-size:10px;margin-top:3px}
      .listing-link{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;color:#087FA9;font-size:11px;font-weight:700;text-decoration:none;border:1px solid #CBE4EF;border-radius:7px;padding:9px 11px}
      .listing-link:hover{background:#EAF6FB}
      .finance-panel{display:grid;grid-template-columns:minmax(115px,.8fr) minmax(0,1.2fr);gap:12px;align-items:stretch}
      .profit-highlight{display:flex;flex-direction:column;justify-content:center;gap:5px;background:#F0F8F4;border:1px solid #DCEFE4;border-radius:9px;padding:11px}
      .profit-highlight>span{color:#557866;font-size:10px;font-weight:700}
      .profit-highlight>b{font-size:19px;line-height:1.2}
      .profit-highlight>small{color:#557866;font-size:10px;letter-spacing:0}
      .fee-grid{display:grid;gap:0}
      .fee-grid div{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #EDF1F4;font-size:10px;color:#708397}
      .fee-grid div:last-child{border-bottom:0}
      .fee-grid b{color:#304B63;white-space:nowrap;font-size:10px}
      .good{color:#137548!important}.bad{color:#B42318!important}
      .results h3{margin:24px 0 12px;color:#18334B;font-size:16px;font-weight:700}
      .results .heading{padding-bottom:16px;border-bottom:1px solid #E8EEF3}
      .disclaimer{background:#F6F8FA;border:1px solid #E8EEF3;border-radius:9px;padding:13px 15px;font-size:10px;line-height:1.65;color:#71869A;margin-top:20px}
      @media(max-width:640px){.product{grid-template-columns:1fr;gap:12px;padding:14px}.product-media{height:190px}.finance-panel{grid-template-columns:1fr}.price-row{align-items:flex-start}.results .heading{flex-direction:column}.cards{grid-template-columns:1fr}}
      footer{max-width:1040px;margin:35px auto 0;padding:20px 0 28px;border-top:1px solid #DCE8F1;display:flex;justify-content:space-between;color:#8195A8;font-size:9px;letter-spacing:1px}
      @media(max-width:760px){.page{padding:0 5%}.hero{margin:42px auto 28px}.panel,.results{padding:20px}.details{grid-template-columns:repeat(2,1fr)}.modes{grid-template-columns:1fr}.heading{gap:10px}.connected{font-size:8px}footer{flex-direction:column;gap:10px;text-align:center}}
    `}</style>
  </main>;
}
