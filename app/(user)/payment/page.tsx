"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Modal } from "@/components/ui";
import { useAuthStore } from "@/store/useAuthStore";
import { WA_LINK, WA_NUMBER } from "@/data/constants";
import { useBanks, useCreatePayment, usePackages } from "@/hooks/useTryoutQueries";

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pkgIdParam = searchParams.get("pkg");

  const { user } = useAuthStore();
  const { data: packages = [] } = usePackages();
  const { data: banks = [] } = useBanks();
  const createPayment = useCreatePayment();

  const [selectedPkgId, setSelectedPkgId] = useState<number | null>(
    pkgIdParam ? parseInt(pkgIdParam, 10) : null,
  );
  const [proofMethod, setProofMethod] = useState<"upload" | "wa">("upload");
  const [proofUrl, setProofUrl] = useState("");
  const [step, setStep] = useState<"select" | "pay" | "done">("select");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showWAWarning, setShowWAWarning] = useState(false);

  const selectedPkg = packages.find((p) => p.id === selectedPkgId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar maks 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setUploadedImage(url);
      setProofUrl(url);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSubmit = () => {
    if (!proofUrl && proofMethod === "upload") {
      alert("Silakan upload bukti transfer terlebih dahulu");
      return;
    }
    // Persist payment proof via API
    if (selectedPkg && user) {
      createPayment.mutate({
        id: "",
        packageId: selectedPkg.id,
        proofUrl: proofUrl || "",
      });
    }
    setStep("done");
  };

  const handleWAConfirm = () => {
    const pkg = selectedPkg;
    const msg = encodeURIComponent(
      `Halo admin FIX ASN,\n\nSaya telah transfer untuk:\n` +
        `Paket: ${pkg?.name}\n` +
        `Nominal: Rp ${pkg?.price.toLocaleString("id-ID")}\n` +
        `Bukti transfer sudah saya upload di sistem.\n\n` +
        `Nama: ${user?.name}\nEmail: ${user?.email}`,
    );
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank");
    setShowWAWarning(false);
    // Persist WA-confirmed payment via API
    if (selectedPkg && user) {
      createPayment.mutate({
        id: "",
        packageId: selectedPkg.id,
        proofUrl: "",
      });
    }
    setStep("done");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="font-black text-2xl text-[#1B3A6B] mb-1">
          {step === "done" ? "🎉" : "💳"} Pembayaran
        </h2>
        <p className="text-gray-400 text-sm">
          {step === "done"
            ? "Pembayaranmu sedang menunggu verifikasi admin"
            : step === "pay"
              ? "Lakukan transfer lalu upload bukti pembayaran"
              : "Pilih paket yang ingin dibeli"}
        </p>
      </div>

      {/* STEP: SELECT */}
      {step === "select" && (
        <>
          {/* Package cards */}
          <div className="flex flex-col gap-3 mb-6">
            {packages
              .filter((p) => p.isActive)
              .map((pkg) => (
                <Card
                  key={pkg.id}
                  hover
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedPkgId === pkg.id
                      ? "border-2 border-blue-500 bg-blue-50"
                      : "border border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        selectedPkgId === pkg.id
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedPkgId === pkg.id && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1B3A6B] to-[#2563EB] flex items-center justify-center text-lg flex-shrink-0">
                        📝
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-[#1B3A6B]">
                            {pkg.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 m-0">
                          {pkg.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-xl text-[#1B3A6B]">
                        Rp {pkg.price.toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
          </div>

          <Button
            variant="primary"
            className="w-full"
            disabled={!selectedPkgId}
            onClick={() => setStep("pay")}
          >
            Lanjut ke Pembayaran →
          </Button>
        </>
      )}

      {/* STEP: PAY */}
      {step === "pay" && selectedPkg && (
        <>
          {/* Order summary */}
          <Card className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1B3A6B] to-[#2563EB] flex items-center justify-center text-lg">
                  📝
                </div>
                <div>
                  <p className="font-extrabold text-base text-[#1B3A6B] m-0">
                    {selectedPkg.name}
                  </p>
                  <p className="text-sm text-gray-500 m-0">
                    {selectedPkg.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-2xl text-[#1B3A6B]">
                  Rp {selectedPkg.price.toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          </Card>

          {/* Transfer instructions */}
          <Card className="mb-4">
            <h3 className="font-extrabold text-base text-[#1B3A6B] mb-3">
              📋 Transfer ke Rekening Berikut
            </h3>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4">
              <p className="text-xs text-amber-700 font-bold mb-3">
                ⚠️ Gunakan nominal transfer yang PERSIS sama untuk mempercepat
                konfirmasi
              </p>
              <div className="flex flex-col gap-2">
                {banks.map((b) => (
                  <div
                    key={b.id}
                    className="flex justify-between items-center px-3 py-2.5 bg-white rounded-lg border border-amber-200"
                  >
                    <div>
                      <span className="font-bold text-sm text-gray-800">
                        Bank {b.bankName}
                      </span>
                      <div className="text-xs text-gray-400">
                        {b.accountHolder}
                      </div>
                    </div>
                    <span className="font-mono font-black text-base text-[#1B3A6B] tracking-wider">
                      {b.accountNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nominal to transfer */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-blue-600 font-bold mb-1">
                Nominal yang harus ditransfer:
              </p>
              <p className="font-black text-2xl text-[#1B3A6B] m-0">
                Rp {selectedPkg.price.toLocaleString("id-ID")}
              </p>
            </div>

            {/* Method tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setProofMethod("upload")}
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm border-2 cursor-pointer transition-all ${
                  proofMethod === "upload"
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                📸 Upload Bukti TF
              </button>
              <button
                onClick={() => setProofMethod("wa")}
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm border-2 cursor-pointer transition-all ${
                  proofMethod === "wa"
                    ? "border-green-500 bg-green-50 text-green-600"
                    : "border-gray-200 bg-white text-gray-500"
                }`}
              >
                💬 Konfirmasi via WA
              </button>
            </div>

            {/* Upload proof */}
            {proofMethod === "upload" && (
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">
                  📸 Upload Bukti Transfer{" "}
                  <span className="text-red-500">*</span>
                </p>
                {uploadedImage ? (
                  <div className="relative rounded-xl overflow-hidden border-2 border-green-400 mb-3 h-64">
                    <Image
                      src={uploadedImage}
                      alt="Bukti transfer"
                      fill
                      unoptimized
                      sizes="100vw"
                      className="object-contain bg-white"
                    />
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        setProofUrl("");
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 bg-gray-50 text-center mb-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl mx-auto mb-2">
                      📷
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      Format: JPG, PNG, Maks 5MB
                    </p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold cursor-pointer hover:bg-blue-600 transition-colors">
                      📁 Pilih File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                <Button
                  variant="primary"
                  className="w-full"
                  disabled={!proofUrl}
                  onClick={handleSubmit}
                >
                  Kirim Bukti Transfer
                </Button>
              </div>
            )}

            {/* WA confirm */}
            {proofMethod === "wa" && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mx-auto mb-3">
                  💬
                </div>
                <h4 className="font-black text-lg text-[#1B3A6B] mb-1">
                  Konfirmasi via WhatsApp
                </h4>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                  Klik tombol di bawah untuk membuka WhatsApp. Sampaikan bahwa
                  Anda sudah transfer dan sebutkan nama paket serta nominal.
                </p>
                <Button
                  variant="success"
                  className="w-full mb-2"
                  onClick={() => setShowWAWarning(true)}
                >
                  💬 Buka WhatsApp
                </Button>
                <p className="text-xs text-gray-400">
                  Verifikasi biasanya dalam 1x24 jam
                </p>
              </div>
            )}
          </Card>

          <Button
            variant="ghost"
            className="w-full mb-3"
            onClick={() => setStep("select")}
          >
            ← Pilih Paket Lain
          </Button>
        </>
      )}

      {/* STEP: DONE */}
      {step === "done" && selectedPkg && (
        <Card className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="font-black text-2xl text-[#1B3A6B] mb-2">
            Bukti Terkirim!
          </h3>
          <p className="text-gray-500 text-sm mb-4 leading-relaxed max-w-sm mx-auto">
            Bukti transfer sudah diterima
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left max-w-sm mx-auto">
            <p className="text-sm text-amber-900 m-0">
              <strong>{selectedPkg.name}</strong>
              <br />
              Rp {selectedPkg.price.toLocaleString("id-ID")}
            </p>
          </div>

          <div className="flex flex-col gap-2 max-w-sm mx-auto">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => router.push("/tryout")}
            >
              Mulai Tryout
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/dashboard")}
            >
              ← Kembali ke Dashboard
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Butuh bantuan?</p>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-green-600 text-sm font-bold no-underline"
            >
              💬 Chat WhatsApp +62 898-7608-379 →
            </a>
          </div>
        </Card>
      )}

      {/* WA confirmation warning modal */}
      {showWAWarning && (
        <Modal
          open
          title="⚠️ Sebelum Hubungi WA"
          onClose={() => setShowWAWarning(false)}
          width={420}
        >
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4">
            <p className="font-bold text-amber-800 text-sm mb-2">
              ⚠️ Jangan transfer ke nomor ini jika sudah pernah transfer
            </p>
            <p className="text-sm text-amber-700 m-0 leading-relaxed">
              Jika kamu sudah transfer dan ingin konfirmasi, gunakan menu{" "}
              <strong>Upload Bukti TF</strong> di atas agar admin bisa
              verifikasi lebih cepat.
            </p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Hubungi WA hanya jika kamu belum bisa upload bukti atau butuh
            bantuan langsung dari admin.
          </p>
          <div className="flex gap-2.5">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowWAWarning(false)}
            >
              Batal
            </Button>
            <Button
              variant="success"
              className="flex-1"
              onClick={handleWAConfirm}
            >
              💬 Buka WhatsApp
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-32 bg-gray-200 rounded-2xl" />
            <div className="h-32 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}

