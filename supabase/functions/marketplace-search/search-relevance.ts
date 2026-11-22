export type ProductIntent = {
  originalQuery: string;
  normalizedQuery: string;
  brand: string | null;
  category: string | null;
  modelTokens: string[];
  accessoryIntent: boolean;
  requestedCondition: "new" | "refurbished" | "used" | null;
};
export type RankedProduct = Record<string, unknown> & {
  relevance_score: number;
  match_classification: "Exact match" | "Strong match" | "Related product" | "Accessory";
  result_group: "best_match" | "related" | "accessory";
  condition_label: "Refurbished" | "Used" | "New" | "Condition not stated";
};

const SPELLING: Record<string, string> = {
  inspirion: "inspiron", elitebok: "elitebook", thinkpad: "thinkpad",
  samsng: "samsung", samsumg: "samsung", appl: "apple", ipone: "iphone",
  galaxyy: "galaxy", chager: "charger", keybord: "keyboard",
};
const BRANDS: Record<string, string> = {
  dell: "Dell", hp: "HP", "hewlett-packard": "HP", lenovo: "Lenovo",
  apple: "Apple", iphone: "Apple", samsung: "Samsung", acer: "Acer",
  asus: "ASUS", microsoft: "Microsoft", logitech: "Logitech",
};
const ACCESSORY_TERMS = ["keyboard","keyboards","charger","charging cable","cable","battery","batteries","hinge","screen replacement","replacement screen","adapter","mouse","case","cover","dock","replacement"];
const CATEGORY_TERMS: Record<string,string[]> = {
  laptop:["laptop","notebook","inspiron","inspiron","elitebook","thinkpad","pavilion","latitude","vivobook","ideapad","macbook"],
  smartphone:["iphone","smartphone","mobile phone","galaxy s","galaxy a","pixel"],
  tablet:["tablet","ipad","galaxy tab"],
  keyboard:["keyboard","keyboards"], charger:["charger","charging cable","power adapter"],
};
const tokens = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean);
const includesPhrase = (haystack:string, phrase:string) => (" "+haystack+" ").includes(" "+phrase+" ");
export function understandProductQuery(input:string): ProductIntent {
  const originalQuery = input.trim().slice(0,160);
  const corrected = tokens(originalQuery).map(t=>SPELLING[t]??t);
  const raw = corrected.join(" ");
  const brandToken = corrected.find(t=>BRANDS[t]);
  const brand = brandToken ? BRANDS[brandToken] : null;
  const accessoryIntent = ACCESSORY_TERMS.some(term=>includesPhrase(raw,term));
  let category:string|null = null;
  if (accessoryIntent) {
    for (const kind of ["keyboard","charger"]) {
      const terms = CATEGORY_TERMS[kind] ?? [];
      if (terms.some(term=>includesPhrase(raw,term))) { category=kind; break; }
    }
  }
  if (!category) {
    for (const [kind,terms] of Object.entries(CATEGORY_TERMS)) {
      if (terms.some(term=>includesPhrase(raw,term))) { category=kind; break; }
    }
  }
  const condition = corrected.includes("refurbished") ? "refurbished" : corrected.includes("used") || corrected.includes("secondhand") ? "used" : corrected.includes("new") ? "new" : null;
  const stop = new Set(["the","and","for","with","brand","laptop","notebook","computer","new","used","refurbished","gb","tb"]);
  const modelTokens = corrected.filter(t=>!stop.has(t) && t!==brandToken && !ACCESSORY_TERMS.some(term=>tokens(term).includes(t)));
  let normalizedQuery = corrected.join(" ");
  if (!accessoryIntent && category==="laptop" && !/\b(laptop|notebook)\b/.test(normalizedQuery)) normalizedQuery += " laptop";
  if (brand && !normalizedQuery.startsWith(brand.toLowerCase())) normalizedQuery = brand.toLowerCase()+" "+normalizedQuery;
  return {originalQuery,normalizedQuery:normalizedQuery.replace(/\s+/g," ").trim(),brand,category,modelTokens,accessoryIntent,requestedCondition:condition};
}
function textOf(p:Record<string,unknown>):string {
  return [p.title,p.brand,p.description,p.key_specs,p.product_badge].flatMap(v=>Array.isArray(v)?v:[v]).filter(v=>typeof v==="string").join(" ").toLowerCase();
}
function isAccessory(text:string):boolean { return ACCESSORY_TERMS.some(term=>includesPhrase(text,term)); }
function conditionOf(text:string):RankedProduct["condition_label"] {
  if (/\b(refurbished|renewed|reconditioned)\b/.test(text)) return "Refurbished";
  if (/\b(used|pre[- ]owned|second hand)\b/.test(text)) return "Used";
  if (/\b(new|brand new)\b/.test(text)) return "New";
  return "Condition not stated";
}
export function rankMarketplaceProducts<T extends Record<string,unknown>>(items:T[], intent:ProductIntent):{
  products:RankedProduct[]; related_products:RankedProduct[]; accessories:RankedProduct[];
} {
  const seen=new Set<string>();
  const ranked=items.map(p=>{
    const title=String(p.title??"");
    const text=textOf(p);
    const accessory=isAccessory(title.toLowerCase());
    const titleTokens=tokens(title);
    const brandMatch=!!intent.brand && (String(p.brand??"").toLowerCase()===intent.brand.toLowerCase() || includesPhrase(text,intent.brand.toLowerCase()));
    const matchedModel=intent.modelTokens.filter(t=>titleTokens.includes(t));
    const modelRatio=intent.modelTokens.length?matchedModel.length/intent.modelTokens.length:0;
    const modelConflict=intent.modelTokens.some(t=>/\\d/.test(t)&&!titleTokens.includes(t));
    const categoryMatch=!intent.category || (intent.category==="laptop" ? /\b(laptop|notebook|inspiron|elitebook|thinkpad|pavilion|latitude|vivobook|ideapad|macbook)\b/.test(text) && !accessory : intent.category==="smartphone" ? /\b(iphone|smartphone|galaxy|pixel)\b/.test(text) && !accessory : intent.category==="tablet" ? /\b(tablet|ipad|galaxy tab)\b/.test(text) && !accessory : text.includes(intent.category));
    const exact=titleTokens.join(" ")===tokens(intent.normalizedQuery).join(" ");
    const score=Math.max(0,Math.min(100,
      (exact?35:Math.min(35,modelRatio*35))+
      (brandMatch?20:0)+(categoryMatch?20:0)+(modelRatio*15)+
      (intent.modelTokens.length?Math.min(10,matchedModel.length*2):5)-
      (accessory && !intent.accessoryIntent?70:0)-
      (!categoryMatch?35:0)-
      (modelConflict?50:0)-
      (intent.brand && !brandMatch?20:0)
    ));
    const classification:RankedProduct["match_classification"]=accessory?"Accessory":score>=80?"Exact match":score>=55?"Strong match":"Related product";
    const result_group:RankedProduct["result_group"]=accessory?"accessory":score>=55?"best_match":"related";
    const condition_label=conditionOf(text);
    const identity=String(p.url??p.id??title).toLowerCase();
    return {...p,relevance_score:Math.round(score),match_classification:classification,result_group,condition_label,_identity:identity};
  }).filter(p=>{
    if(seen.has(p._identity)) return false;
    seen.add(p._identity); return true;
  }).sort((a,b)=>b.relevance_score-a.relevance_score);
  const clean=(p:RankedProduct)=>{const {_identity,...rest}=p;return rest;};
  return {
    products:ranked.filter(p=>p.result_group==="best_match").map(clean),
    related_products:ranked.filter(p=>p.result_group==="related").map(clean),
    accessories:ranked.filter(p=>p.result_group==="accessory").map(clean),
  };
}
