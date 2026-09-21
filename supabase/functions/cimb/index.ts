import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-phone, x-password",
};

const ALLOWED_ACTIONS = [
  "get",
  "check",
  "login",
  "register",
  "upload",
  "update",
  "delete",
  "stream",
  "check-pin",
  "set-pin",
  "withdraw",
  "review-withdrawal",
  "call-create",
  "call-accept",
  "call-reject",
  "call-end",
];

const IMMUTABLE_FIELDS = ["phone", "created_at", "updated_at"];

const EDITABLE_FIELDS = new Set([
  "email",
  "name",
  "role",
  "balance",
  "pin",
  "password",
  "avatar",
  "kyc_status",
  "kyc_is_verified",
  "kyc_address_line",
  "kyc_city",
  "kyc_state",
  "kyc_postcode",
  "kyc_country",
  "kyc_identity_full_name",
  "kyc_identity_gender",
  "kyc_identity_nationality",
  "kyc_identity_id_type",
  "kyc_identity_mykad_number",
  "kyc_identity_date_of_birth",
  "kyc_documents_id_image_url",
  "kyc_documents_face_image_url",
  "kyc_documents_selfie_image_url",
  "kyc_verification_verified_at",
  "kyc_emergency_contact_name",
  "kyc_emergency_contact_phone",
  "kyc_emergency_contact_relationship",
  "bank_name",
  "bank_account_name",
  "bank_account_number",
  "loan_amount",
  "loan_status",
  "loan_approved",
  "loan_interest",
  "loan_is_active",
  "loan_tenure_months",
  "loan_applied_amount",
  "loan_approved_amount",
  "loan_monthly_installment",
  "loan_interest_rate",
  "loan_total_interest",
  "loan_total_payable",
  "bills",
]);

const ALLOWED_UPLOAD_FIELDS = new Set([
  "avatar",
  "kyc_id",
  "kyc_face",
  "kyc_selfie",
  "bill_qr",
  "bill_bank",
  "bill_bank_image",
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Convert storage://bucket/path to signed URL (1 hour expiry = 3600s)
async function signStorageUrl(
  supabase: ReturnType<typeof createClient>,
  uri: string | null | undefined
): Promise<string | null> {
  if (!uri || typeof uri !== "string") return null;
  if (!uri.startsWith("storage://")) return uri;

  const withoutPrefix = uri.slice("storage://".length);
  const slashIdx = withoutPrefix.indexOf("/");
  if (slashIdx === -1) return uri;

  const bucket = withoutPrefix.slice(0, slashIdx);
  const path = withoutPrefix.slice(slashIdx + 1);

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

// Sanitize user: removes password and pin, resolves signed URLs for KYC documents, includes has_pin
async function sanitizeUser(
  supabase: ReturnType<typeof createClient>,
  user: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { password: _p, pin: rawPin, ...sanitized } = user;
  sanitized.has_pin = Boolean(rawPin && String(rawPin).trim().length > 0);

  if (typeof sanitized.kyc_documents_id_image_url === "string") {
    sanitized.kyc_documents_id_image_url = await signStorageUrl(
      supabase,
      sanitized.kyc_documents_id_image_url as string
    );
  }
  if (typeof sanitized.kyc_documents_face_image_url === "string") {
    sanitized.kyc_documents_face_image_url = await signStorageUrl(
      supabase,
      sanitized.kyc_documents_face_image_url as string
    );
  }
  if (typeof sanitized.kyc_documents_selfie_image_url === "string") {
    sanitized.kyc_documents_selfie_image_url = await signStorageUrl(
      supabase,
      sanitized.kyc_documents_selfie_image_url as string
    );
  }

  return sanitized;
}

// Authenticate via phone and plaintext password from DB
async function authenticate(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  password: string
): Promise<{ user: Record<string, unknown> | null; errorStatus: number; errorMsg: string }> {
  if (!phone || !password) {
    return { user: null, errorStatus: 401, errorMsg: "Authentication failed" };
  }

  const { data, error } = await supabase
    .from("cimb_users")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (error || !data) {
    return { user: null, errorStatus: 404, errorMsg: "User not found" };
  }

  if (data.password !== password) {
    return { user: null, errorStatus: 401, errorMsg: "Password salah" };
  }

  if (data.role !== "user" && data.role !== "admin") {
    return { user: null, errorStatus: 403, errorMsg: "Unauthorized" };
  }

  return { user: data, errorStatus: 200, errorMsg: "" };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (!action || !ALLOWED_ACTIONS.includes(action)) {
    return jsonResponse(
      {
        success: false,
        error: "Action tidak valid",
        allowed_actions: ALLOWED_ACTIONS,
      },
      400
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    // ----------------------------------------------------
    // ACTION: check (GET)
    // ----------------------------------------------------
    if (action === "check") {
      if (req.method !== "GET") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      const phone = url.searchParams.get("phone");
      if (!phone) {
        return jsonResponse({ success: false, error: "Phone is required" }, 400);
      }

      const { data, error } = await supabase
        .from("cimb_users")
        .select("phone")
        .eq("phone", phone.trim())
        .maybeSingle();

      if (error) {
        return jsonResponse({ success: false, error: "Database error", detail: error.message }, 500);
      }

      return jsonResponse({
        success: true,
        action: "check",
        exists: Boolean(data),
        phone: phone.trim(),
      });
    }

    // ----------------------------------------------------
    // ACTION: register (POST)
    // ----------------------------------------------------
    if (action === "register") {
      if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      let body: any;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
      }

      const name = typeof body?.name === "string" ? body.name.trim() : "";
      const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
      const password = typeof body?.password === "string" ? body.password : "";
      const avatar = typeof body?.avatar === "string" && body.avatar.trim()
        ? body.avatar.trim()
        : `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`;

      if (!name || !phone || !password) {
        return jsonResponse(
          { success: false, error: "Field wajib: name, phone, password" },
          400
        );
      }

      // Check if phone already registered
      const { data: existingUser } = await supabase
        .from("cimb_users")
        .select("phone")
        .eq("phone", phone)
        .maybeSingle();

      if (existingUser) {
        return jsonResponse({ success: false, error: "Phone sudah terdaftar" }, 409);
      }

      const newUserPayload = {
        name,
        phone,
        password,
        avatar,
        role: "user",
        balance: 0,
        kyc_status: "unverified",
        kyc_is_verified: false,
        loan_amount: 0,
        loan_status: null,
        loan_approved: false,
        loan_is_active: false,
        loan_tenure_months: 24,
        loan_applied_amount: 0,
        loan_approved_amount: 0,
        loan_monthly_installment: 0,
        bills: [],
      };

      const { data: inserted, error: insertError } = await supabase
        .from("cimb_users")
        .insert(newUserPayload)
        .select("*")
        .single();

      if (insertError) {
        return jsonResponse({ success: false, error: "Database error", detail: insertError.message }, 500);
      }

      const sanitized = await sanitizeUser(supabase, inserted);
      return jsonResponse({ success: true, action: "register", data: sanitized }, 201);
    }

    // ----------------------------------------------------
    // ACTION: login (POST)
    // ----------------------------------------------------
    if (action === "login") {
      if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      let body: any;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
      }

      const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
      const password = typeof body?.password === "string" ? body.password : "";

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      const sanitized = await sanitizeUser(supabase, auth.user);
      return jsonResponse({ success: true, action: "login", data: sanitized });
    }

    // ----------------------------------------------------
    // ACTION: get (GET)
    // ----------------------------------------------------
    if (action === "get") {
      if (req.method !== "GET") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      const phone = req.headers.get("x-phone") || url.searchParams.get("phone") || "";
      const password = req.headers.get("x-password") || url.searchParams.get("password") || "";

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      if (auth.user.role === "admin") {
        const { data: allUsers, error: listError } = await supabase
          .from("cimb_users")
          .select("*")
          .order("created_at", { ascending: false });

        if (listError) {
          return jsonResponse({ success: false, error: "Database error", detail: listError.message }, 500);
        }

        const sanitizedList = await Promise.all(
          (allUsers || []).map((u) => sanitizeUser(supabase, u))
        );

        return jsonResponse({
          success: true,
          action: "get",
          data: sanitizedList,
        });
      }

      // User role returns an array containing their sanitized record
      const sanitized = await sanitizeUser(supabase, auth.user);
      return jsonResponse({
        success: true,
        action: "get",
        data: [sanitized],
      });
    }

    // ----------------------------------------------------
    // ACTION: update (POST)
    // ----------------------------------------------------
    if (action === "update") {
      if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      let body: any;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
      }

      const phone = req.headers.get("x-phone") || body?.phone || "";
      const password = req.headers.get("x-password") || body?.password || "";
      const targetPhone = (body?.target_phone || phone || "").trim();
      const updateData = body?.data || {};

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      // Ownership check
      if (auth.user.role !== "admin" && targetPhone !== auth.user.phone) {
        return jsonResponse(
          { success: false, error: "Forbidden: user can update own account only" },
          403
        );
      }

      // Check immutable fields
      for (const field of IMMUTABLE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(updateData, field)) {
          return jsonResponse(
            { success: false, error: `Immutable field: ${field}` },
            400
          );
        }
      }

      // Check valid fields
      for (const field of Object.keys(updateData)) {
        if (!EDITABLE_FIELDS.has(field)) {
          return jsonResponse(
            { success: false, error: `Field not allowed: ${field}` },
            400
          );
        }
      }

      // Fetch target user current state
      const { data: targetUser, error: targetError } = await supabase
        .from("cimb_users")
        .select("*")
        .eq("phone", targetPhone)
        .maybeSingle();

      if (targetError || !targetUser) {
        return jsonResponse({ success: false, error: "Target user not found" }, 404);
      }

      // KYC rules
      if (auth.user.role === "user") {
        if (targetUser.kyc_status === "verified") {
          const kycFieldModified = Object.keys(updateData).some((k) =>
            k.startsWith("kyc_")
          );
          if (kycFieldModified) {
            return jsonResponse(
              { success: false, error: "KYC already verified and cannot be modified" },
              409
            );
          }
        }

        if (
          Object.prototype.hasOwnProperty.call(updateData, "kyc_is_verified") ||
          Object.prototype.hasOwnProperty.call(updateData, "kyc_verification_verified_at")
        ) {
          return jsonResponse(
            { success: false, error: "Forbidden: cannot modify verification flags" },
            403
          );
        }

        if (
          updateData.kyc_status &&
          !["unverified", "draft", "submitted"].includes(updateData.kyc_status)
        ) {
          return jsonResponse(
            { success: false, error: "Invalid kyc_status for user" },
            400
          );
        }
      }

      // Admin KYC transitions
      if (auth.user.role === "admin" && updateData.kyc_status) {
        if (updateData.kyc_status === "verified") {
          const idDoc = updateData.kyc_documents_id_image_url ?? targetUser.kyc_documents_id_image_url;
          const faceDoc = updateData.kyc_documents_face_image_url ?? targetUser.kyc_documents_face_image_url;
          const selfieDoc = updateData.kyc_documents_selfie_image_url ?? targetUser.kyc_documents_selfie_image_url;

          if (!idDoc || !faceDoc || !selfieDoc) {
            return jsonResponse(
              {
                success: false,
                error: "All three KYC documents are required before approval",
              },
              400
            );
          }

          updateData.kyc_is_verified = true;
          updateData.kyc_verification_verified_at = new Date().toISOString();
        } else if (
          updateData.kyc_status === "rejected" ||
          updateData.kyc_status === "under_review"
        ) {
          updateData.kyc_is_verified = false;
          updateData.kyc_verification_verified_at = null;
        }
      }

      // Bills V2 validation: enforce image and complete details before activation
      if (Array.isArray(updateData.bills)) {
        for (let i = 0; i < (updateData.bills as any[]).length; i++) {
          const b = (updateData.bills as any[])[i];
          if (b.duitnow_qr?.is_active === true) {
            if (!b.duitnow_qr.qr_image_url || typeof b.duitnow_qr.qr_image_url !== "string" || !b.duitnow_qr.qr_image_url.trim()) {
              return jsonResponse(
                {
                  success: false,
                  error: `DuitNow QR pada bil '${b.bill_name || i}' tidak boleh diaktifkan tanpa gambar qr_image_url.`,
                },
                400
              );
            }
          }
          if (b.transfer_bank?.is_active === true) {
            const tb = b.transfer_bank;
            if (
              !tb.bank_image_url ||
              !tb.bank_name ||
              !tb.account_name ||
              !tb.account_number ||
              !String(tb.bank_name).trim() ||
              !String(tb.account_name).trim() ||
              !String(tb.account_number).trim() ||
              !String(tb.bank_image_url).trim()
            ) {
              return jsonResponse(
                {
                  success: false,
                  error: `Transfer Bank pada bil '${b.bill_name || i}' tidak boleh diaktifkan tanpa gambar dan data akaun bank lengkap (bank_name, account_name, account_number, bank_image_url).`,
                },
                400
              );
            }
          }
        }
      }

      const { data: updated, error: updateError } = await supabase
        .from("cimb_users")
        .update(updateData)
        .eq("phone", targetPhone)
        .select("*")
        .single();

      if (updateError) {
        return jsonResponse({ success: false, error: "Database error", detail: updateError.message }, 500);
      }

      const sanitized = await sanitizeUser(supabase, updated);
      return jsonResponse({ success: true, action: "update", data: sanitized });
    }

    // ----------------------------------------------------
    // ACTION: upload (POST Multipart)
    // ----------------------------------------------------
    if (action === "upload") {
      if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      let formData: FormData;
      try {
        formData = await req.formData();
      } catch {
        return jsonResponse({ success: false, error: "Invalid multipart form data" }, 400);
      }

      const phone = req.headers.get("x-phone") || (formData.get("phone") as string) || "";
      const password = req.headers.get("x-password") || (formData.get("password") as string) || "";
      const field = formData.get("field") as string;
      const file = formData.get("file") as File;
      const targetPhone = ((formData.get("target_phone") as string) || phone).trim();
      const billIndexStr = formData.get("bill_index") as string | null;

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      if (!ALLOWED_UPLOAD_FIELDS.has(field)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid field",
            allowed_fields: Array.from(ALLOWED_UPLOAD_FIELDS),
          },
          400
        );
      }

      if (!file || !(file instanceof File) || file.size === 0) {
        return jsonResponse({ success: false, error: "File is required" }, 400);
      }

      if (file.size > MAX_FILE_SIZE) {
        return jsonResponse({ success: false, error: "File exceeds 10MB limit" }, 413);
      }

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return jsonResponse({ success: false, error: "Unsupported image type" }, 415);
      }

      // KYC permissions
      if (field.startsWith("kyc_")) {
        if (auth.user.role !== "admin" && targetPhone !== auth.user.phone) {
          return jsonResponse(
            {
              success: false,
              error: "Forbidden: user can upload own KYC documents only",
            },
            403
          );
        }

        const currentStatus = auth.user.kyc_status;
        if (auth.user.role === "user" && (currentStatus === "under_review" || currentStatus === "verified")) {
          return jsonResponse(
            { success: false, error: "KYC documents cannot be uploaded in current status" },
            409
          );
        }
      }

      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const fileBuffer = await file.arrayBuffer();

      let bucket = "bucketcimb";
      let path = "";
      let dbUpdateField: string | null = null;
      let storageRef = "";

      if (field === "avatar") {
        bucket = "bucketcimb";
        path = `users/${targetPhone}/avatar/avatar.${ext}`;
        dbUpdateField = "avatar";
      } else if (field === "kyc_id") {
        bucket = "bucketcimb_kyc";
        path = `users/${targetPhone}/kyc/id/id.${ext}`;
        dbUpdateField = "kyc_documents_id_image_url";
      } else if (field === "kyc_face") {
        bucket = "bucketcimb_kyc";
        path = `users/${targetPhone}/kyc/face/face.${ext}`;
        dbUpdateField = "kyc_documents_face_image_url";
      } else if (field === "kyc_selfie") {
        bucket = "bucketcimb_kyc";
        path = `users/${targetPhone}/kyc/selfie/selfie.${ext}`;
        dbUpdateField = "kyc_documents_selfie_image_url";
      } else if (field === "bill_qr") {
        if (billIndexStr === null || billIndexStr === undefined) {
          return jsonResponse({ success: false, error: "bill_index is required for bill_qr" }, 400);
        }
        const billIndex = parseInt(billIndexStr, 10);
        bucket = "bucketcimb";
        path = `users/${targetPhone}/bills/${billIndex}/duitnow-qr.${ext}`;
      } else if (field === "bill_bank" || field === "bill_bank_image") {
        if (billIndexStr === null || billIndexStr === undefined) {
          return jsonResponse({ success: false, error: "bill_index is required for bill_bank" }, 400);
        }
        const billIndex = parseInt(billIndexStr, 10);
        bucket = "bucketcimb";
        path = `users/${targetPhone}/bills/${billIndex}/bank-info.${ext}`;
      }

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, fileBuffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        return jsonResponse(
          { success: false, error: "Storage upload error", detail: uploadError.message },
          500
        );
      }

      storageRef = `storage://${bucket}/${path}`;
      let returnUrl = storageRef;

      // If bucket is public or general, get public URL; if KYC, generate signed URL
      if (bucket === "bucketcimb_kyc") {
        returnUrl = (await signStorageUrl(supabase, storageRef)) ?? storageRef;
      } else {
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
        returnUrl = publicData.publicUrl;
      }

      // Update database row
      if (dbUpdateField) {
        const dbValue = bucket === "bucketcimb_kyc" ? storageRef : returnUrl;
        await supabase
          .from("cimb_users")
          .update({ [dbUpdateField]: dbValue })
          .eq("phone", targetPhone);
      } else if (field === "bill_qr") {
        const billIndex = parseInt(billIndexStr!, 10);
        const { data: targetU } = await supabase
          .from("cimb_users")
          .select("bills")
          .eq("phone", targetPhone)
          .maybeSingle();

        const bills = Array.isArray(targetU?.bills) ? [...targetU.bills] : [];
        if (bills[billIndex]) {
          bills[billIndex] = {
            ...bills[billIndex],
            duitnow_qr: {
              ...(bills[billIndex].duitnow_qr || {}),
              qr_image_url: returnUrl,
            },
          };
          await supabase
            .from("cimb_users")
            .update({ bills })
            .eq("phone", targetPhone);
        }
      } else if (field === "bill_bank" || field === "bill_bank_image") {
        const billIndex = parseInt(billIndexStr!, 10);
        const { data: targetU } = await supabase
          .from("cimb_users")
          .select("bills")
          .eq("phone", targetPhone)
          .maybeSingle();

        const bills = Array.isArray(targetU?.bills) ? [...targetU.bills] : [];
        if (bills[billIndex]) {
          bills[billIndex] = {
            ...bills[billIndex],
            transfer_bank: {
              ...(bills[billIndex].transfer_bank || {}),
              bank_image_url: returnUrl,
            },
          };
          await supabase
            .from("cimb_users")
            .update({ bills })
            .eq("phone", targetPhone);
        }
      }

      return jsonResponse({
        success: true,
        action: "upload",
        data: { url: returnUrl },
      });
    }

    // ----------------------------------------------------
    // ACTION: delete (POST)
    // ----------------------------------------------------
    if (action === "delete") {
      if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      let body: any;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
      }

      const phone = req.headers.get("x-phone") || body?.phone || "";
      const password = req.headers.get("x-password") || body?.password || "";
      const targetPhone = (body?.target_phone || phone || "").trim();

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      if (auth.user.role !== "admin" && targetPhone !== auth.user.phone) {
        return jsonResponse(
          { success: false, error: "Forbidden: user can delete own account only" },
          403
        );
      }

      // Cleanup files in storage
      try {
        const { data: listCimb } = await supabase.storage
          .from("bucketcimb")
          .list(`users/${targetPhone}`);
        if (listCimb && listCimb.length > 0) {
          const paths = listCimb.map((f) => `users/${targetPhone}/${f.name}`);
          await supabase.storage.from("bucketcimb").remove(paths);
        }

        const { data: listKyc } = await supabase.storage
          .from("bucketcimb_kyc")
          .list(`users/${targetPhone}/kyc`);
        if (listKyc && listKyc.length > 0) {
          const paths = listKyc.map((f) => `users/${targetPhone}/kyc/${f.name}`);
          await supabase.storage.from("bucketcimb_kyc").remove(paths);
        }
      } catch {
        // Continue row deletion even if storage cleanup has partial errors
      }

      const { error: deleteError } = await supabase
        .from("cimb_users")
        .delete()
        .eq("phone", targetPhone);

      if (deleteError) {
        return jsonResponse({ success: false, error: "Database error", detail: deleteError.message }, 500);
      }

      return jsonResponse({
        success: true,
        action: "delete",
        data: { phone: targetPhone, deleted: true },
      });
    }

    // ----------------------------------------------------
    // ACTION: stream (GET SSE)
    // ----------------------------------------------------
    if (action === "stream") {
      if (req.method !== "GET") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      const phone = req.headers.get("x-phone") || url.searchParams.get("phone") || "";
      const password = req.headers.get("x-password") || url.searchParams.get("password") || "";

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      const bodyStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          // Initial state
          const initialSanitized = await sanitizeUser(supabase, auth.user!);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                success: true,
                action: "stream",
                data: initialSanitized,
              })}\n\n`
            )
          );

          // Heartbeat interval (15s)
          const pingTimer = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(": ping\n\n"));
            } catch {
              clearInterval(pingTimer);
            }
          }, 15000);

          // Listen to changes via Supabase Realtime channel
          const channel = supabase
            .channel(`stream_${auth.user!.phone}_${Date.now()}`)
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "cimb_users",
                filter: `phone=eq.${auth.user!.phone}`,
              },
              async (payload) => {
                try {
                  const sanitized = await sanitizeUser(supabase, payload.new as any);
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        success: true,
                        action: "stream",
                        data: sanitized,
                      })}\n\n`
                    )
                  );
                } catch (err) {
                  console.error("Stream update error:", err);
                }
              }
            )
            .on(
              "postgres_changes",
              {
                event: "DELETE",
                schema: "public",
                table: "cimb_users",
                filter: `phone=eq.${auth.user!.phone}`,
              },
              () => {
                try {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        success: true,
                        action: "stream",
                        data: null,
                        deleted: true,
                      })}\n\n`
                    )
                  );
                  controller.close();
                } catch {
                  // already closed
                } finally {
                  clearInterval(pingTimer);
                  supabase.removeChannel(channel);
                }
              }
            )
            .subscribe((status) => {
              if (
                status === "CHANNEL_ERROR" ||
                status === "TIMED_OUT" ||
                status === "CLOSED"
              ) {
                try {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        success: false,
                        action: "stream",
                        error: `Realtime subscription ${status}`,
                      })}\n\n`
                    )
                  );
                } catch {
                  // stream ended
                }
              }
            });
        },
      });

      return new Response(bodyStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ----------------------------------------------------
    // ACTION: check-pin (GET or POST) - Withdrawal Flow V1.3
    // ----------------------------------------------------
    if (action === "check-pin") {
      let phone = req.headers.get("x-phone") || url.searchParams.get("phone") || "";
      let password = req.headers.get("x-password") || url.searchParams.get("password") || "";

      if (req.method === "POST") {
        try {
          const body = await req.json();
          phone = phone || body?.phone || "";
          password = password || body?.password || "";
        } catch {
          // ignore json parse error, rely on params/headers
        }
      }

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      const rawPin = auth.user.pin;
      const hasPin = Boolean(rawPin && String(rawPin).trim().length === 6 && /^\d{6}$/.test(String(rawPin).trim()));

      return jsonResponse({
        success: true,
        action: "check-pin",
        phone: auth.user.phone,
        has_pin: hasPin,
      });
    }

    // ----------------------------------------------------
    // ACTION: set-pin (POST) - Withdrawal Flow V1.3
    // ----------------------------------------------------
    if (action === "set-pin") {
      if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      let body: any;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
      }

      const phone = req.headers.get("x-phone") || body?.phone || "";
      const password = req.headers.get("x-password") || body?.password || "";
      const pin = String(body?.pin || "").trim();
      const confirmPin = body?.confirm_pin ? String(body.confirm_pin).trim() : null;

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      if (!pin || !/^\d{6}$/.test(pin)) {
        return jsonResponse({ success: false, error: "PIN mestilah tepat 6 digit angka." }, 400);
      }

      if (confirmPin !== null && confirmPin !== pin) {
        return jsonResponse({ success: false, error: "Pengesahan PIN tidak sepadan." }, 400);
      }

      const { error: updateError } = await supabase
        .from("cimb_users")
        .update({ pin })
        .eq("phone", auth.user.phone);

      if (updateError) {
        return jsonResponse({ success: false, error: "Gagal menyimpan PIN", detail: updateError.message }, 500);
      }

      return jsonResponse({
        success: true,
        action: "set-pin",
        message: "PIN berjaya dicipta.",
        has_pin: true,
      });
    }

    // ----------------------------------------------------
    // ACTION: withdraw (POST) - Withdrawal Flow V1.3
    // ----------------------------------------------------
    if (action === "withdraw") {
      if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      let body: any;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
      }

      const phone = req.headers.get("x-phone") || body?.phone || "";
      const password = req.headers.get("x-password") || body?.password || "";
      const amount = Number(body?.amount);
      const pin = String(body?.pin || "").trim();

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      if (!amount || isNaN(amount) || amount <= 0) {
        return jsonResponse({ success: false, error: "Jumlah pengeluaran tidak sah." }, 400);
      }

      // Backend Verify PIN
      const userPin = auth.user.pin ? String(auth.user.pin).trim() : "";
      if (!userPin) {
        return jsonResponse({
          success: false,
          error: "PIN belum ditetapkan. Sila cipta PIN 6-digit terlebih dahulu.",
        }, 400);
      }

      if (pin !== userPin) {
        // Rule: PIN salah → withdrawal tidak dibuat
        return jsonResponse({
          success: false,
          error: "PIN keselamatan tidak tepat. Sila cuba lagi.",
        }, 400);
      }

      // Rule: PIN benar → Create Withdrawal (Pending), Data Bank dari cimb_users
      const withdrawalRecord = {
        id: `WD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        type: "withdrawal",
        amount,
        status: "pending",
        bank_name: (auth.user.bank_name as string) || "-",
        bank_account_number: (auth.user.bank_account_number as string) || "-",
        bank_account_name: (auth.user.bank_account_name as string) || (auth.user.name as string) || "-",
        created_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
        reject_reason: null,
        bill_id: null,
      };

      const currentBills = Array.isArray(auth.user.bills) ? auth.user.bills : [];
      const updatedBills = [withdrawalRecord, ...currentBills];

      const { error: saveError } = await supabase
        .from("cimb_users")
        .update({ bills: updatedBills })
        .eq("phone", auth.user.phone);

      if (saveError) {
        return jsonResponse({
          success: false,
          error: "Gagal memproses permohonan pengeluaran.",
          detail: saveError.message,
        }, 500);
      }

      return jsonResponse({
        success: true,
        action: "withdraw",
        data: withdrawalRecord,
        message: "Permohonan pengeluaran berjaya dihantar dan kini berstatus Pending.",
      });
    }

    // ----------------------------------------------------
    // ACTION: review-withdrawal (POST) - Withdrawal Flow V1.3
    // ----------------------------------------------------
    if (action === "review-withdrawal") {
      if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      let body: any;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
      }

      const phone = req.headers.get("x-phone") || body?.phone || "";
      const password = req.headers.get("x-password") || body?.password || "";
      const targetPhone = String(body?.target_phone || "").trim();
      const withdrawalId = String(body?.withdrawal_id || "").trim();
      const decision = String(body?.decision || "").toLowerCase().trim(); // 'approve' | 'reject'
      const rejectReason = body?.reject_reason ? String(body.reject_reason).trim() : null;

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      if (auth.user.role !== "admin") {
        return jsonResponse({ success: false, error: "Akses dihadkan untuk pentadbir sahaja." }, 403);
      }

      if (!targetPhone || !withdrawalId || !["approve", "reject"].includes(decision)) {
        return jsonResponse({ success: false, error: "Parameter review-withdrawal tidak lengkap atau tidak sah." }, 400);
      }

      const { data: targetUser, error: targetError } = await supabase
        .from("cimb_users")
        .select("*")
        .eq("phone", targetPhone)
        .maybeSingle();

      if (targetError || !targetUser) {
        return jsonResponse({ success: false, error: "Pengguna tidak ditemui." }, 404);
      }

      const billsList = Array.isArray(targetUser.bills) ? [...targetUser.bills] : [];
      const wdIndex = billsList.findIndex((b: any) => b.id === withdrawalId);
      if (wdIndex === -1) {
        return jsonResponse({ success: false, error: "Permohonan pengeluaran tidak ditemui." }, 404);
      }

      const targetWithdrawal = { ...billsList[wdIndex] };
      const now = new Date().toISOString();

      if (decision === "reject") {
        // Rule: Reject → Rejected, tidak membuat bill
        targetWithdrawal.status = "rejected";
        targetWithdrawal.reviewed_at = now;
        targetWithdrawal.reviewed_by = "admin";
        targetWithdrawal.reject_reason = rejectReason;
        billsList[wdIndex] = targetWithdrawal;

        const { error: rejectUpdateErr } = await supabase
          .from("cimb_users")
          .update({ bills: billsList })
          .eq("phone", targetPhone);

        if (rejectUpdateErr) {
          return jsonResponse({ success: false, error: "Gagal mengemaskini status penolakan." }, 500);
        }

        return jsonResponse({
          success: true,
          action: "review-withdrawal",
          decision: "reject",
          data: targetWithdrawal,
          message: "Permohonan pengeluaran telah ditolak.",
        });
      }

      // Rule: Approve → Approved, Create Bill → Bill = Unpaid
      const newBillId = `BILL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const newBill = {
        id: newBillId,
        bill_name: `Bayaran Pengeluaran Tunai RM ${Number(targetWithdrawal.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
        amount: Number(targetWithdrawal.amount || 0),
        status: "unpaid",
        is_active: true,
        created_at: now,
        duitnow_qr: {
          is_active: false,
          qr_image_url: null,
        },
        transfer_bank: {
          is_active: false,
          bank_name: "",
          account_name: "",
          account_number: "",
          bank_image_url: null,
        },
      };

      targetWithdrawal.status = "approved";
      targetWithdrawal.reviewed_at = now;
      targetWithdrawal.reviewed_by = "admin";
      targetWithdrawal.bill_id = newBillId;
      billsList[wdIndex] = targetWithdrawal;

      // Prepend new unpaid bill so it appears at top of bills
      const updatedBills = [newBill, ...billsList];

      const { error: approveUpdateErr } = await supabase
        .from("cimb_users")
        .update({ bills: updatedBills })
        .eq("phone", targetPhone);

      if (approveUpdateErr) {
        return jsonResponse({ success: false, error: "Gagal meluluskan pengeluaran dan menjana bil." }, 500);
      }

      return jsonResponse({
        success: true,
        action: "review-withdrawal",
        decision: "approve",
        withdrawal: targetWithdrawal,
        bill: newBill,
        message: "Pengeluaran diluluskan dan bil berstatus Unpaid berjaya dijana.",
      });
    }

    // ----------------------------------------------------
    // ACTION: call-create (POST)
    // ----------------------------------------------------
    if (action === "call-create") {
      if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      let body: any;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
      }

      const phone = req.headers.get("x-phone") || body?.phone || "";
      const password = req.headers.get("x-password") || body?.password || "";
      const receiverPhone = String(body?.receiver_phone || "CIMB_OFFICER").trim();

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      const callerPhone = String(auth.user.phone);
      const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const callPayload = {
        id: callId,
        caller_phone: callerPhone,
        receiver_phone: receiverPhone,
        status: "ringing",
        created_at: now,
        started_at: null,
        ended_at: null,
        duration_seconds: 0,
        ended_by: null,
        end_reason: null,
        last_activity_at: now,
        updated_at: now,
      };

      const { data: newCall, error: callErr } = await supabase
        .from("cimb_calls")
        .insert(callPayload)
        .select("*")
        .single();

      if (callErr) {
        // Return structured payload even if table doesn't exist yet
        return jsonResponse({
          success: true,
          action: "call-create",
          call: callPayload,
        });
      }

      // Log event
      await supabase.from("cimb_call_events").insert({
        call_id: callId,
        actor_phone: callerPhone,
        event_type: "call_initiated",
        metadata: { receiver_phone: receiverPhone },
      }).catch(() => null);

      return jsonResponse({
        success: true,
        action: "call-create",
        call: newCall || callPayload,
      });
    }

    // ----------------------------------------------------
    // ACTION: call-accept (POST)
    // ----------------------------------------------------
    if (action === "call-accept") {
      if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      let body: any;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
      }

      const phone = req.headers.get("x-phone") || body?.phone || "";
      const password = req.headers.get("x-password") || body?.password || "";
      const callId = String(body?.call_id || "").trim();

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      const now = new Date().toISOString();
      const { data: updatedCall, error: acceptErr } = await supabase
        .from("cimb_calls")
        .update({
          status: "accepted",
          started_at: now,
          last_activity_at: now,
          updated_at: now,
        })
        .eq("id", callId)
        .select("*")
        .maybeSingle();

      if (acceptErr) {
        return jsonResponse({
          success: true,
          action: "call-accept",
          call: { id: callId, status: "accepted", started_at: now },
        });
      }

      return jsonResponse({
        success: true,
        action: "call-accept",
        call: updatedCall,
      });
    }

    // ----------------------------------------------------
    // ACTION: call-reject (POST)
    // ----------------------------------------------------
    if (action === "call-reject") {
      if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      let body: any;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
      }

      const phone = req.headers.get("x-phone") || body?.phone || "";
      const password = req.headers.get("x-password") || body?.password || "";
      const callId = String(body?.call_id || "").trim();
      const reason = String(body?.reason || "declined").trim();

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      const now = new Date().toISOString();
      const { data: rejectedCall } = await supabase
        .from("cimb_calls")
        .update({
          status: "rejected",
          ended_at: now,
          ended_by: String(auth.user.phone),
          end_reason: reason,
          last_activity_at: now,
          updated_at: now,
        })
        .eq("id", callId)
        .select("*")
        .maybeSingle();

      return jsonResponse({
        success: true,
        action: "call-reject",
        call: rejectedCall || { id: callId, status: "rejected", end_reason: reason },
      });
    }

    // ----------------------------------------------------
    // ACTION: call-end (POST)
    // ----------------------------------------------------
    if (action === "call-end") {
      if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

      let body: any;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
      }

      const phone = req.headers.get("x-phone") || body?.phone || "";
      const password = req.headers.get("x-password") || body?.password || "";
      const callId = String(body?.call_id || "").trim();
      const reason = String(body?.reason || "completed").trim();
      const durationSeconds = Number(body?.duration_seconds || 0);

      const auth = await authenticate(supabase, phone, password);
      if (!auth.user) {
        return jsonResponse({ success: false, error: auth.errorMsg }, auth.errorStatus);
      }

      const now = new Date().toISOString();
      const { data: endedCall } = await supabase
        .from("cimb_calls")
        .update({
          status: "ended",
          ended_at: now,
          ended_by: String(auth.user.phone),
          end_reason: reason,
          duration_seconds: durationSeconds,
          last_activity_at: now,
          updated_at: now,
        })
        .eq("id", callId)
        .select("*")
        .maybeSingle();

      return jsonResponse({
        success: true,
        action: "call-end",
        call: endedCall || { id: callId, status: "ended", end_reason: reason, duration_seconds: durationSeconds },
      });
    }

    return jsonResponse({ success: false, error: "Action tidak dikenali" }, 400);
  } catch (err: any) {
    return jsonResponse(
      {
        success: false,
        error: "Internal Server Error",
        detail: err?.message || String(err),
      },
      500
    );
  }
});
