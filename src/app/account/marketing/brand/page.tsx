"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const URL = "https://itxxnhcjjiynrmivexcb.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
type Session = { access_token?: string; refresh_token?: string; expires_at?: number; [key: string]: unknown };
type Brand = { id?: string; business_name: string; business_description: string; industry: string; website_url: string; product_categories: string; target_customers: string; target_markets: string; brand_personality: string; brand_voice: string; preferred_writing_style: string; preferred_languages: string; business_objectives: string; competitor_names: string; approved_product_facts: string; prohibited_claims: string };
type Product = { id: string; product_name: string; product_description: string; selling_price: number | null; product_category: string; image_reference: string | null; product_benefits: string; verified_specifications: string; target_audience: string; promotional_information: string; stock_information: string | null; is_active: boolean };
const emptyBrand: Brand = { business_name:"",business_description:"",industry:"",website_url:"",product_categories:"",target_customers:"",target_markets:"",brand_personality:"",brand_voice:"",preferred_writing_style:"",preferred_languages:"English",business_objectives:"",competitor_names:"",approved_product_facts:"",prohibited_claims:"" };
const field: React.CSSProperties = { width:"100%",padding:11,border:"1px solid #D5E1EA",borderRadius:8,fontSize:13,color:"#17364D",background:"#fff",boxSizing:"border-box" };
const label: React.CSSProperties = { display:"grid",gap:6,fontSize:12,fontWeight:700,color:"#40566B" };
const split = (v:string) => v.split(",").map(x=>x.trim()).filter(Boolean);
const join = (v:unknown) => Array.isArray(v) ? v.join(", ") : "";
export default function BrandProductsPage() {
  const [brand,setBrand]=useState<Brand>(emptyBrand);
  const [products,setProducts]=useState<Product[]>([]);
  const [product,setProduct]=useState({product_name:"",product_description:"",selling_price:"",product_category:"",image_reference:"",product_benefits:"",verified_specifications:"",target_audience:"",promotional_information:"",stock_information:""});
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const authHeaders=useCallback(async()=>{
    if(!KEY) throw new Error("Seller account services are not configured.");
    let session:Session|null=null;
    try{const raw=localStorage.getItem("ekhaya_session");session=raw?JSON.parse(raw) as Session:null;}catch{localStorage.removeItem("ekhaya_session");}
    if(!session?.access_token||!session.refresh_token) throw new Error("Sign in to manage your brand profile.");
    if(Number(session.expires_at)>Date.now()/1000+60)return {apikey:KEY,Authorization:"Bearer "+session.access_token};
    const response=await fetch(URL+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify({refresh_token:session.refresh_token})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.access_token||!data.refresh_token){localStorage.removeItem("ekhaya_session");throw new Error("Your seller session has expired. Sign in again.");}
    localStorage.setItem("ekhaya_session",JSON.stringify({...session,...data,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in??3600)}));
    return {apikey:KEY,Authorization:"Bearer "+data.access_token};
  },[]);
  const request=useCallback(async(path:string,init:RequestInit={})=>{
    const headers=await authHeaders();
    const response=await fetch(URL+"/rest/v1/"+path,{...init,headers:{...headers,"Content-Type":"application/json",Prefer:"return=representation",...(init.headers??{})},cache:"no-store"});
    const data=await response.json().catch(()=>[]);
    if(!response.ok)throw new Error(data.message??data.msg??"Could not save your Marketing information.");
    return data;
  },[authHeaders]);
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const [brands,rows]=await Promise.all([
        request("seller_marketing_brand_profiles?select=*&limit=1"),
        request("seller_marketing_products?select=*&order=updated_at.desc&limit=100")
      ]);
      if(brands[0]){const b=brands[0];setBrand({...emptyBrand,...b,product_categories:join(b.product_categories),target_markets:join(b.target_markets),preferred_languages:join(b.preferred_languages),competitor_names:join(b.competitor_names)});}
      setProducts(rows);
    }catch(e){setError(e instanceof Error?e.message:"Unable to load your brand workspace.");}
    finally{setLoading(false);}
  },[request]);
  useEffect(()=>{void load();},[load]);
  const saveBrand=async(e:React.FormEvent)=>{
    e.preventDefault();setSaving(true);setError("");setNotice("");
    try{
      const payload={business_name:brand.business_name.trim(),business_description:brand.business_description.trim(),industry:brand.industry.trim(),website_url:brand.website_url.trim()||null,product_categories:split(brand.product_categories),target_customers:brand.target_customers.trim(),target_markets:split(brand.target_markets),brand_personality:brand.brand_personality.trim(),brand_voice:brand.brand_voice.trim(),preferred_writing_style:brand.preferred_writing_style.trim(),preferred_languages:split(brand.preferred_languages),business_objectives:brand.business_objectives.trim(),competitor_names:split(brand.competitor_names),approved_product_facts:brand.approved_product_facts.trim(),prohibited_claims:brand.prohibited_claims.trim()};
      await request("seller_marketing_brand_profiles?on_conflict=user_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(payload)});
      setNotice("Brand profile saved. AI generation can use these details as context.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not save your brand profile.");}
    finally{setSaving(false);}
  };
  const saveProduct=async(e:React.FormEvent)=>{
    e.preventDefault();if(!product.product_name.trim()){setError("Enter a product name.");return;}
    setSaving(true);setError("");setNotice("");
    try{
      const payload={product_name:product.product_name.trim(),product_description:product.product_description.trim(),selling_price:product.selling_price.trim()?Number(product.selling_price):null,product_category:product.product_category.trim(),image_reference:product.image_reference.trim()||null,product_benefits:product.product_benefits.trim(),verified_specifications:product.verified_specifications.trim(),target_audience:product.target_audience.trim(),promotional_information:product.promotional_information.trim(),stock_information:product.stock_information.trim()||null};
      if(payload.selling_price!==null&&(!Number.isFinite(payload.selling_price)||payload.selling_price<0))throw new Error("Enter a valid non-negative product price.");
      await request("seller_marketing_products",{method:"POST",body:JSON.stringify(payload)});
      setProduct({product_name:"",product_description:"",selling_price:"",product_category:"",image_reference:"",product_benefits:"",verified_specifications:"",target_audience:"",promotional_information:"",stock_information:""});
      setNotice("Product profile saved.");await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not save product.");}
    finally{setSaving(false);}
  };
  const deleteProduct=async(id:string)=>{
    if(!window.confirm("Delete this saved product profile?"))return;
    setSaving(true);setError("");
    try{await request("seller_marketing_products?id=eq."+encodeURIComponent(id),{method:"DELETE",headers:{Prefer:"return=minimal"}});setProducts(rows=>rows.filter(x=>x.id!==id));setNotice("Product profile deleted.");}
    catch(e){setError(e instanceof Error?e.message:"Could not delete product.");}
    finally{setSaving(false);}
  };
  const updateBrand=(key:keyof Brand,value:string)=>setBrand(b=>({...b,[key]:value}));
  const input=(key:keyof Brand,title:string,placeholder="",multi=false)=><label style={label}>{title}{multi?<textarea rows={3} value={brand[key] as string} onChange={e=>updateBrand(key,e.target.value)} placeholder={placeholder} style={{...field,resize:"vertical"}}/>:<input value={brand[key] as string} onChange={e=>updateBrand(key,e.target.value)} placeholder={placeholder} style={field}/>}</label>;
  return <main style={{minHeight:"100vh",background:"#F5F8FB",padding:"26px 18px 50px",color:"#102A43"}}><div style={{maxWidth:1080,margin:"0 auto"}}>
    <Link href="/account/marketing/" style={{color:"#0789BE",fontSize:13,fontWeight:800,textDecoration:"none"}}>← AI Marketing workspace</Link>
    <h1 style={{fontSize:28,fontFamily:"Manrope,sans-serif",margin:"14px 0 6px"}}>Brand profile & product library</h1>
    <p style={{color:"#60758A",fontSize:13,marginTop:0}}>Save your business identity and verified product details once, then reuse them as context for AI marketing drafts.</p>
    {error&&<p role="alert" style={{padding:12,background:"#FFF0ED",color:"#A43B2B",borderRadius:8}}>{error}</p>}
    {notice&&<p role="status" style={{padding:12,background:"#E8F6EE",color:"#147A46",borderRadius:8}}>{notice}</p>}
    {loading?<p>Loading your seller workspace…</p>:<>
      <form onSubmit={saveBrand} style={{background:"#fff",border:"1px solid #E1EAF1",borderRadius:14,padding:20,display:"grid",gap:14}}>
        <div><h2 style={{fontSize:19,margin:"0 0 5px"}}>Business and brand identity</h2><p style={{fontSize:12,color:"#71869A",margin:0}}>Only your signed-in seller account can access this profile.</p></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
          {input("business_name","Business name","Your registered or trading name")}
          {input("industry","Industry","e.g. beauty, fashion, food")}
          {input("website_url","Website","https://example.co.za")}
          {input("product_categories","Product categories (comma separated)","e.g. skincare, fragrances")}
          {input("target_markets","Target geographical markets (comma separated)","e.g. Gauteng, South Africa")}
          {input("preferred_languages","Preferred languages (comma separated)","English, isiZulu")}
          {input("brand_personality","Brand personality","e.g. confident, warm, premium")}
          {input("brand_voice","Brand voice","e.g. friendly and professional")}
          {input("preferred_writing_style","Preferred writing style","e.g. concise, informative")}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12}}>
          {input("business_description","Business description","What do you sell and what makes your business useful?",true)}
          {input("target_customers","Target customers","Describe your intended customers.",true)}
          {input("business_objectives","Business objectives","What do you want your marketing to achieve?",true)}
          {input("competitor_names","Competitors supplied by you (comma separated)","Names only; no live research is performed.",true)}
          {input("approved_product_facts","Approved product facts","Facts AI may safely repeat.",true)}
          {input("prohibited_claims","Prohibited claims and restrictions","Claims, wording or promises AI must avoid.",true)}
        </div>
        <button disabled={saving} style={{padding:13,border:0,borderRadius:8,background:"#079BD3",color:"#fff",fontWeight:800}}>{saving?"SAVING…":"SAVE BRAND PROFILE"}</button>
      </form>
      <section style={{background:"#fff",border:"1px solid #E1EAF1",borderRadius:14,padding:20,marginTop:16}}>
        <h2 style={{fontSize:19,margin:"0 0 5px"}}>Product library</h2><p style={{fontSize:12,color:"#71869A",marginTop:0}}>Enter facts you have verified. Missing prices, stock levels and specifications are left blank rather than invented.</p>
        <form onSubmit={saveProduct} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:11}}>
          <label style={label}>Product name *<input required maxLength={160} value={product.product_name} onChange={e=>setProduct(p=>({...p,product_name:e.target.value}))} style={field}/></label>
          <label style={label}>Selling price (ZAR)<input type="number" min="0" step="0.01" value={product.selling_price} onChange={e=>setProduct(p=>({...p,selling_price:e.target.value}))} style={field}/></label>
          <label style={label}>Category<input value={product.product_category} onChange={e=>setProduct(p=>({...p,product_category:e.target.value}))} style={field}/></label>
          <label style={label}>Image reference (optional)<input value={product.image_reference} onChange={e=>setProduct(p=>({...p,image_reference:e.target.value}))} placeholder="URL or internal reference; no upload configured" style={field}/></label>
          <label style={{...label,gridColumn:"1/-1"}}>Product description<textarea rows={3} value={product.product_description} onChange={e=>setProduct(p=>({...p,product_description:e.target.value}))} style={{...field,resize:"vertical"}}/></label>
          <label style={label}>Product benefits<textarea rows={3} value={product.product_benefits} onChange={e=>setProduct(p=>({...p,product_benefits:e.target.value}))} style={{...field,resize:"vertical"}}/></label>
          <label style={label}>Verified specifications<textarea rows={3} value={product.verified_specifications} onChange={e=>setProduct(p=>({...p,verified_specifications:e.target.value}))} style={{...field,resize:"vertical"}}/></label>
          <label style={label}>Target audience<input value={product.target_audience} onChange={e=>setProduct(p=>({...p,target_audience:e.target.value}))} style={field}/></label>
          <label style={label}>Promotional information<input value={product.promotional_information} onChange={e=>setProduct(p=>({...p,promotional_information:e.target.value}))} style={field}/></label>
          <label style={label}>Stock information (optional)<input value={product.stock_information} onChange={e=>setProduct(p=>({...p,stock_information:e.target.value}))} style={field}/></label>
          <button disabled={saving} style={{padding:12,border:0,borderRadius:8,background:"#075477",color:"#fff",fontWeight:800,alignSelf:"end"}}>{saving?"SAVING…":"ADD PRODUCT"}</button>
        </form>
        <div style={{display:"grid",gap:10,marginTop:18}}>{products.map(item=><article key={item.id} style={{border:"1px solid #E1EAF1",borderRadius:10,padding:13,display:"flex",justifyContent:"space-between",gap:12,alignItems:"start"}}><div><strong>{item.product_name}</strong><p style={{fontSize:12,color:"#60758A",margin:"4px 0"}}>{item.product_category||"Uncategorised"}{item.selling_price!==null?" · R"+Number(item.selling_price).toFixed(2):" · Price not supplied"}</p><p style={{fontSize:12,margin:0,whiteSpace:"pre-wrap"}}>{item.product_description}</p></div><button type="button" disabled={saving} onClick={()=>void deleteProduct(item.id)} style={{border:"1px solid #E5C9C5",background:"#fff",color:"#A43B2B",padding:"7px 10px",borderRadius:7}}>Delete</button></article>)}{products.length===0&&<p style={{fontSize:12,color:"#71869A"}}>No saved products yet.</p>}</div>
      </section>
    </>}
    <p style={{fontSize:11,color:"#71869A",marginTop:16}}>Brand and product profiles are seller-owned. AI drafts remain suggestions and must be checked before publishing.</p>
  </div></main>;
}
