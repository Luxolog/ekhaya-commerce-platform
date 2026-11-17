"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router=useRouter();
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if(password.length<12) {setError("Use at least 12 characters for your password.");return;}
    if(password!==confirm) {setError("The passwords do not match.");return;}
    setBusy(true);
    try {
      const supabase=createClient();
      const {data,error:sessionError}=await supabase.auth.getUser();
      if(sessionError || !data.user) throw new Error("Your invitation session is invalid or expired. Ask your workspace admin to send a new invitation.");
      const {error:updateError}=await supabase.auth.updateUser({password});
      if(updateError) throw updateError;
      router.replace("/");
      router.refresh();
    } catch(e) {setError(e instanceof Error?e.message:"Unable to set your password.");}
    finally {setBusy(false);}
  }
  return <main className="login-shell"><section className="login-card"><div className="brand-mark">E</div><p className="eyebrow">EKHAYA SUPPORT DESK</p><h1>Set your password.</h1><p className="muted">Create a secure password to finish joining your workspace.</p><form className="login-form" onSubmit={submit}><label>Password<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm password<input type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy?"Saving…":"Set password and continue"}</button></form><p className="login-foot">Use at least 12 characters.</p></section></main>;
}
