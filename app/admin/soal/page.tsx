"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Tags } from "lucide-react";
import type { Question, QuestionCategory, Tryout } from "@/lib/types";
import { Button, Card, Modal } from "@/components/ui";
import SoalTable from "@/components/admin/SoalTable";
import ImageUpload from "@/components/admin/ImageUpload";
import { defaultOptionWeights, isValidOptionWeight } from "@/lib/questionWeights";
import { getScore } from "@/lib/scoring";
import { useQuestionTopics } from "@/hooks/useQuestionTopics";
import QuestionTopicManager from "@/components/admin/QuestionTopicManager";
import QuestionBankPicker from "@/components/admin/QuestionBankPicker";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/shadcn/combobox";
import {
  useAllTryouts,
  usePackages,
  useTryouts,
  useTryoutQuestions,
} from "@/hooks/useTryoutQueries";

interface SoalFormState {
  category: QuestionCategory;
  topicId: number | null;
  question: string;
  questionImage: string;
  opts: string[];
  optImgs: string[];
  correctAnswer: number;
  tkpValues: number[];
  explanation: string;
  explanationImg: string;
}

interface TopicOption {
  value: string;
  label: string;
}

function emptyForm(): SoalFormState {
  return {
    category: "TWK",
    topicId: null,
    question: "",
    questionImage: "",
    opts: ["", "", "", "", ""],
    optImgs: ["", "", "", "", ""],
    correctAnswer: 0,
    tkpValues: defaultOptionWeights("TWK"),
    explanation: "",
    explanationImg: "",
  };
}

function questionPayload(form: SoalFormState) {
  return {
    category: form.category,
    topicId: form.topicId,
    question: form.question,
    questionImage: form.questionImage || null,
    correctAnswer: form.category === "TKP" ? null : form.correctAnswer,
    explanation: form.explanation || null,
    explanationImage: form.explanationImg || null,
    options: form.opts.map((text, index) => ({
      optionIndex: index,
      optionText: text || null,
      optionImage: form.optImgs[index] || null,
      tkpValue: form.tkpValues[index],
    })),
  };
}

export default function SoalPage() {
  const queryClient = useQueryClient();
  const topicsQuery = useQuestionTopics();
  const topics = topicsQuery.data ?? [];
  const [showTopicManager, setShowTopicManager] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<QuestionCategory | "all">("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const {
    data: packages = [],
    isFetching: isFetchingPackages,
    error: packagesError,
  } = usePackages();
  const {
    data: packageBanks = {},
    isFetching: isFetchingTryouts,
    error: tryoutsError,
  } = useTryouts();
  const {
    data: allTryouts = [],
    isFetching: isFetchingAllTryouts,
    error: allTryoutsError,
  } = useAllTryouts();

  const [activePkgTab, setActivePkgTab] = useState<string | number>("trial");
  const [activeTryoutTab, setActiveTryoutTab] = useState<number | null>(null);
  const [durationDraft, setDurationDraft] = useState<number | null>(null);

  const [showAddSoal, setShowAddSoal] = useState(false);
  const [bankTarget, setBankTarget] = useState<{ id: number; name: string } | null>(null);
  const [editSoal, setEditSoal] = useState<number | null>(null);
  const [soalForm, setSoalForm] = useState<SoalFormState>(emptyForm);
  const [soalSavedMsg, setSoalSavedMsg] = useState("");

  const trialTryouts = useMemo(
    () => allTryouts.filter((tryout) => tryout.isTrial),
    [allTryouts],
  );

  const paidPackageBanks = useMemo(() => {
    const banks: Record<string, Tryout[]> = {};
    for (const [packageId, tryouts] of Object.entries(packageBanks)) {
      // Show every tryout assigned to the package, including trial tryouts.
      // Same tryout can belong to multiple packages; edits stay synced by shared tryout.id.
      banks[packageId] = tryouts;
    }
    return banks;
  }, [packageBanks]);

  const currentBank =
    activePkgTab && activePkgTab !== "trial"
      ? paidPackageBanks[String(activePkgTab)] || []
      : trialTryouts;

  const currentTab =
    activeTryoutTab && currentBank.find((t) => t.id === activeTryoutTab)
      ? activeTryoutTab
      : currentBank[0]?.id;

  const currentTryout = currentBank.find((t) => t.id === currentTab) ?? null;

  const currentTryoutId = currentTryout?.id ?? null;
  const { data: fetchedQuestions = [], isFetching: isFetchingQuestions } =
    useTryoutQuestions(currentTryoutId);

  const currentTryoutWithQuestions = useMemo(
    () =>
      currentTryout ? { ...currentTryout, questions: fetchedQuestions } : null,
    [currentTryout, fetchedQuestions],
  );

  const currentQ = currentTryoutWithQuestions?.questions || [];
  const filterTopics = topics.filter((topic) => categoryFilter === "all" || topic.category === categoryFilter);
  const effectiveTopicFilter = topicFilter === "unassigned" || filterTopics.some((topic) => String(topic.id) === topicFilter) ? topicFilter : "all";
  const topicFilterOptions: TopicOption[] = [
    { value: "all", label: "Semua topik" },
    { value: "unassigned", label: "Belum ditentukan" },
    ...filterTopics.map((topic) => ({ value: String(topic.id), label: categoryFilter === "all" ? `${topic.category} — ${topic.name}` : topic.name })),
  ];
  const formTopicOptions: TopicOption[] = [
    { value: "", label: "Belum ditentukan" },
    ...topics.filter((topic) => topic.category === soalForm.category).map((topic) => ({ value: String(topic.id), label: topic.name })),
  ];
  if (soalForm.topicId != null && !formTopicOptions.some((option) => option.value === String(soalForm.topicId))) {
    formTopicOptions.push({ value: String(soalForm.topicId), label: "Topik tidak tersedia — pilih ulang" });
  }
  const filteredQuestions = currentQ.filter((question) =>
    (categoryFilter === "all" || question.category === categoryFilter) &&
    (effectiveTopicFilter === "all" || (effectiveTopicFilter === "unassigned" ? question.topicId == null : String(question.topicId) === effectiveTopicFilter)),
  );
  const activePkg = packages.find((p) => p.id === activePkgTab);
  const adminDuration =
    durationDraft ??
    currentTryout?.durationMin ??
    (currentTryout?.isTrial ? 15 : 100);

  const invalidateTryouts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tryouts"] }),
      queryClient.invalidateQueries({ queryKey: ["all-tryouts"] }),
      queryClient.invalidateQueries({ queryKey: ["question-bank"] }),
      queryClient.invalidateQueries({
        queryKey: ["tryout-questions"],
      }),
      queryClient.invalidateQueries({ queryKey: ["attempt"] }),
    ]);
  };

  const saveQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!currentTryout) throw new Error("Pilih tryout terlebih dahulu");
      const method = editSoal ? "PUT" : "POST";
      const url = editSoal
        ? `/api/tryouts/${currentTryout.id}/questions/${editSoal}`
        : `/api/tryouts/${currentTryout.id}/questions`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questionPayload(soalForm)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan soal");
      return data as { success: boolean; question: Question };
    },
    onSuccess: async () => {
      await invalidateTryouts();
      setShowAddSoal(false);
      setEditSoal(null);
      setSoalSavedMsg(editSoal ? "Soal diperbarui." : "Soal ditambahkan.");
      setTimeout(() => setSoalSavedMsg(""), 2500);
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      if (!currentTryout) throw new Error("Pilih tryout terlebih dahulu");
      const res = await fetch(
        `/api/tryouts/${currentTryout.id}/questions/${questionId}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus soal");
      return data as { success: boolean };
    },
    onSuccess: async () => {
      await invalidateTryouts();
      setSoalSavedMsg("Soal dihapus dari tryout ini.");
      setTimeout(() => setSoalSavedMsg(""), 2500);
    },
  });

  const saveDurationMutation = useMutation({
    mutationFn: async () => {
      if (!currentTryout) throw new Error("Pilih tryout terlebih dahulu");
      const res = await fetch(`/api/tryouts/${currentTryout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMin: adminDuration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan durasi");
      return data;
    },
    onSuccess: async () => {
      await invalidateTryouts();
      setDurationDraft(null);
      setSoalSavedMsg(`Durasi diset ke ${adminDuration} menit.`);
      setTimeout(() => setSoalSavedMsg(""), 2500);
    },
  });

  const openAddSoal = () => {
    setSoalForm(emptyForm());
    setEditSoal(null);
    setShowAddSoal(true);
  };

  const openEditSoal = (q: Question) => {
    setSoalForm({
      category: q.category,
      topicId: q.topicId ?? null,
      question: q.question,
      questionImage: q.questionImage || "",
      opts: Array.from(
        { length: 5 },
        (_, index) => q.options[index]?.optionText || "",
      ),
      optImgs: Array.from(
        { length: 5 },
        (_, index) => q.options[index]?.optionImage || "",
      ),
      correctAnswer: q.correctAnswer ?? 0,
      tkpValues: Array.from(
        { length: 5 },
        (_, index) => getScore(q, index),
      ),
      explanation: q.explanation || "",
      explanationImg: q.explanationImage || "",
    });
    setEditSoal(q.id);
    setShowAddSoal(true);
  };

  const saveSoal = () => {
    if (!soalForm.question.trim() && !soalForm.questionImage) {
      alert("Pertanyaan tidak boleh kosong!");
      return;
    }

    const filledOpts = soalForm.opts.filter((option, index) => {
      return option.trim().length > 0 || Boolean(soalForm.optImgs[index]);
    });
    if (filledOpts.length < 2) {
      alert("Isi minimal 2 pilihan jawaban (A dan B)!");
      return;
    }

    if (soalForm.tkpValues.some((value) => !isValidOptionWeight(value))) {
      alert("Bobot jawaban harus berupa bilangan bulat nonnegatif (maksimal 2147483647).");
      return;
    }

    saveQuestionMutation.mutate();
  };

  const isLoading = isFetchingPackages || isFetchingTryouts || isFetchingAllTryouts;
  const pageError = packagesError || tryoutsError || allTryoutsError;

  return (
    <div>
      <div className="flex justify-between items-start sm:items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-black text-xl sm:text-2xl text-brand mb-1">
            Bank Soal
          </h2>
          <p className="text-gray-400 text-sm m-0">
            Kelola soal per paket tryout secara terpisah
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="primary" size="sm" onClick={() => setShowTopicManager(true)}
            className="inline-flex min-h-10 items-center gap-2 shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <Tags aria-hidden="true" className="size-4" />
            Kelola Topik
          </Button>
          <span className="font-bold text-sm text-gray-500">Durasi:</span>
          <input
            type="number"
            value={adminDuration}
            min={1}
            max={300}
            disabled={!currentTryout || saveDurationMutation.isPending}
            onChange={(e) => setDurationDraft(Number(e.target.value))}
            className="w-16 px-1.5 py-1 border border-gray-200 rounded-lg font-bold text-sm text-center"
          />
          <span className="text-sm text-gray-500">menit</span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => saveDurationMutation.mutate()}
            disabled={!currentTryout || saveDurationMutation.isPending}
          >
            {saveDurationMutation.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>

      {soalSavedMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 font-bold text-green-700 text-sm">
          {soalSavedMsg}
        </div>
      )}

      {(saveQuestionMutation.error ||
        deleteQuestionMutation.error ||
        saveDurationMutation.error) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 font-bold text-red-700 text-sm">
          {saveQuestionMutation.error?.message ||
            deleteQuestionMutation.error?.message ||
            saveDurationMutation.error?.message}
        </div>
      )}

      {pageError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">
          Gagal memuat data bank soal.
        </div>
      )}

      {isLoading && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex items-center gap-2 text-gray-400 text-sm">
          <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          Memuat data bank soal...
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <div
          onClick={() => {
            setActivePkgTab("trial");
            setActiveTryoutTab(null);
            setDurationDraft(null);
          }}
          className={`rounded-xl p-4 cursor-pointer select-none transition-all ${
            activePkgTab === "trial"
              ? "border-2 border-amber-500 bg-amber-50"
              : "border border-gray-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-sm text-amber-600">
              Trial Gratis
            </span>
            {activePkgTab === "trial" && (
              <span className="bg-amber-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-md">
                AKTIF
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {trialTryouts.length} tryout · {trialTryouts.reduce((sum, tryout) => sum + (tryout._questionCount ?? tryout.questions.length), 0)} soal total
          </div>
        </div>

        {packages.map((pkg) => {
            const bank = paidPackageBanks[String(pkg.id)] || [];
            const totalSoal = bank.reduce(
              (sum, tryout) => sum + (tryout._questionCount || 0),
              0,
            );
            const isActive = activePkgTab === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => {
                  setActivePkgTab(pkg.id);
                  setActiveTryoutTab(bank[0]?.id || null);
                  setDurationDraft(null);
                }}
                className={`rounded-xl p-4 cursor-pointer select-none transition-all ${
                  isActive
                    ? "border-2 border-blue-500 bg-blue-50"
                    : "border border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-brand">
                    {pkg.name}
                  </span>
                  {isActive && (
                    <span className="bg-blue-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-md">
                      AKTIF
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {bank.length} tryout · {totalSoal} soal total
                </div>
              </div>
            );
          })}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4">
        <div>
          <label htmlFor="question-category-filter" className="mb-1 block text-xs font-semibold text-gray-600">Kategori soal</label>
          <select id="question-category-filter" value={categoryFilter} onChange={(event) => {
            setCategoryFilter(event.target.value as QuestionCategory | "all"); setTopicFilter("all");
          }} className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm">
            <option value="all">Semua kategori</option>
            {(["TWK", "TIU", "TKP"] as const).map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <label htmlFor="question-topic-filter" className="mb-1 block text-xs font-semibold text-gray-600">Topik soal</label>
          <Combobox items={topicFilterOptions} value={topicFilterOptions.find((option) => option.value === effectiveTopicFilter) ?? null}
            isItemEqualToValue={(a, b) => a.value === b.value} autoHighlight
            onValueChange={(option) => { if (option) setTopicFilter(option.value); }}>
            <ComboboxInput id="question-topic-filter" placeholder="Cari topik..." className="min-h-10 w-full rounded-lg bg-white" />
            <ComboboxContent>
              <ComboboxEmpty>Topik tidak ditemukan.</ComboboxEmpty>
              <ComboboxList>{(option: TopicOption) => <ComboboxItem key={option.value} value={option}>{option.label}</ComboboxItem>}</ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
        <p role="status" className="py-2 text-xs text-gray-500">Menampilkan {filteredQuestions.length} dari {currentQ.length} soal</p>
        {topicsQuery.isError && <p role="alert" className="w-full text-sm text-red-700">Topik gagal dimuat. <button type="button" disabled={topicsQuery.isFetching} onClick={() => void topicsQuery.refetch()} className="rounded px-2 py-1 font-semibold underline">Coba Lagi</button></p>}
      </div>

      <Card className="p-0 overflow-hidden">
        {activePkgTab === "trial" && (
          <div>
            <div aria-label="Pilihan tryout gratis" className="flex overflow-x-auto border-b border-gray-100 bg-gray-50">
              {trialTryouts.map((tryout) => (
                <button
                  key={tryout.id}
                  type="button"
                  aria-pressed={currentTab === tryout.id}
                  onClick={() => {
                    setActiveTryoutTab(tryout.id);
                    setDurationDraft(null);
                  }}
                  className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-600 ${
                    currentTab === tryout.id
                      ? "border-amber-500 bg-white text-amber-700"
                      : "border-transparent text-gray-500"
                  }`}
                >
                  {tryout.name}
                  <span className="ml-1.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-extrabold text-amber-700">
                    {tryout._questionCount ?? tryout.questions.length}
                  </span>
                </button>
              ))}
            </div>
            <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-brand">{currentTryout?.name ?? "Trial Gratis"}</span>
                <span className="text-sm text-gray-400 ml-2">
                  {currentTryoutWithQuestions?.questions?.length || 0} soal
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="inline-flex min-h-9 items-center gap-2 border-0! bg-brand/10! hover:bg-brand/15! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" disabled={!currentTryout || isFetchingQuestions} onClick={() => currentTryout && setBankTarget({ id: currentTryout.id, name: currentTryout.name })}>
                  <BookOpen aria-hidden="true" className="size-4 shrink-0" />
                  Pilih dari Bank Soal
                </Button>
                <Button variant="gold" size="sm" onClick={openAddSoal} disabled={!currentTryout}>+ Tambah Soal</Button>
              </div>
            </div>
            <div className="p-3 sm:p-4">
              {isFetchingQuestions && fetchedQuestions.length === 0 ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
                  <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  Memuat soal...
                </div>
              ) : (
                <SoalTable
                  questions={filteredQuestions}
                  topics={topics}
                  isFiltered={categoryFilter !== "all" || effectiveTopicFilter !== "all"}
                  onEdit={(q) => openEditSoal(q)}
                  onDelete={(id) => deleteQuestionMutation.mutate(id)}
                />
              )}
            </div>
          </div>
        )}

        {activePkgTab && activePkgTab !== "trial" && (
          <div>
            <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50">
              {currentBank.map((tryout) => (
                <button
                  key={tryout.id}
                  onClick={() => {
                    setActiveTryoutTab(tryout.id);
                    setDurationDraft(null);
                  }}
                  className={`px-4 py-2.5 border-b-2 flex-shrink-0 font-bold text-sm transition-all ${
                    currentTab === tryout.id
                      ? "border-blue-500 text-blue-600 bg-white"
                      : "border-transparent text-gray-500"
                  }`}
                >
                  {tryout.isTrial && (
                    <span className="mr-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-700 uppercase">
                      Trial
                    </span>
                  )}
                  {tryout.name}
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-md text-xs font-extrabold ${
                      currentTab === tryout.id
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {tryout._questionCount || 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-brand break-words">
                {activePkg?.name} - {currentTryout?.name}
                <span className="font-normal text-gray-400 text-sm ml-2">
                  ({currentQ.length} soal · TWK:
                  {currentQ.filter((q) => q.category === "TWK").length} TIU:
                  {currentQ.filter((q) => q.category === "TIU").length} TKP:
                  {currentQ.filter((q) => q.category === "TKP").length})
                </span>
              </span>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="inline-flex min-h-9 items-center gap-2 border-0! bg-brand/10! hover:bg-brand/15! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" disabled={!currentTryout || isFetchingQuestions} onClick={() => currentTryout && setBankTarget({ id: currentTryout.id, name: currentTryout.name })}>
                  <BookOpen aria-hidden="true" className="size-4 shrink-0" />
                  Pilih dari Bank Soal
                </Button>
                <Button variant="primary" size="sm" onClick={openAddSoal} disabled={!currentTryout}>+ Tambah Soal</Button>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              {isFetchingQuestions && fetchedQuestions.length === 0 ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
                  <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  Memuat soal...
                </div>
              ) : (
                <SoalTable
                  questions={filteredQuestions}
                  topics={topics}
                  isFiltered={categoryFilter !== "all" || effectiveTopicFilter !== "all"}
                  onEdit={(q) => openEditSoal(q)}
                  onDelete={(id) => deleteQuestionMutation.mutate(id)}
                />
              )}
            </div>
          </div>
        )}
      </Card>

      {showTopicManager && <QuestionTopicManager onClose={() => setShowTopicManager(false)} />}
      {bankTarget && <QuestionBankPicker key={bankTarget.id} tryoutId={bankTarget.id} tryoutName={bankTarget.name}
        onClose={() => setBankTarget(null)} onAttached={(addedCount) => {
          setBankTarget(null);
          setSoalSavedMsg(addedCount > 0 ? `${addedCount} soal ditambahkan dari bank soal.` : "Soal terpilih sudah ada di tryout ini.");
          setTimeout(() => setSoalSavedMsg(""), 2500);
        }} />}

      {showAddSoal && (
        <Modal
          open
          title={editSoal ? "Edit Soal" : "Tambah Soal"}
          onClose={() => {
            setShowAddSoal(false);
            setEditSoal(null);
          }}
          width={620}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1.5">
                Kategori
              </label>
              <div className="flex flex-wrap gap-2">
                {(["TWK", "TIU", "TKP"] as QuestionCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setSoalForm((f) => ({
                        ...f,
                        category: cat,
                        topicId: f.category === cat ? f.topicId : null,
                        tkpValues: (f.category === "TKP") !== (cat === "TKP")
                          ? defaultOptionWeights(cat, f.correctAnswer)
                          : f.tkpValues,
                      }))
                    }
                    className={`px-4 py-2 border-2 rounded-lg cursor-pointer font-bold text-sm transition-all ${
                      soalForm.category === cat
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-gray-200 bg-white text-gray-500"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="question-topic" className="mb-1.5 block text-sm font-bold text-gray-700">Topik soal <span className="font-normal text-gray-400">(opsional)</span></label>
              <Combobox items={formTopicOptions} value={formTopicOptions.find((option) => option.value === String(soalForm.topicId ?? "")) ?? null}
                isItemEqualToValue={(a, b) => a.value === b.value} autoHighlight disabled={topicsQuery.isPending || topicsQuery.isError}
                onValueChange={(option) => { if (option) setSoalForm((form) => ({ ...form, topicId: option.value ? Number(option.value) : null })); }}>
                <ComboboxInput id="question-topic" placeholder="Cari topik..." className="min-h-10 w-full rounded-lg bg-white" disabled={topicsQuery.isPending || topicsQuery.isError} />
                <ComboboxContent>
                  <ComboboxEmpty>Topik tidak ditemukan.</ComboboxEmpty>
                  <ComboboxList>{(option: TopicOption) => <ComboboxItem key={option.value} value={option}>{option.label}</ComboboxItem>}</ComboboxList>
                </ComboboxContent>
              </Combobox>
              <p className="mt-1.5 text-xs text-gray-500">{topicsQuery.isPending ? "Memuat topik..." : topicsQuery.isError ? "Topik gagal dimuat. Tutup form dan gunakan Coba Lagi." : `Hanya topik ${soalForm.category} yang ditampilkan. Tambahkan topik melalui Kelola Topik.`}</p>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1.5">
                Pertanyaan
              </label>
              <textarea
                rows={3}
                value={soalForm.question}
                onChange={(e) =>
                  setSoalForm((f) => ({ ...f, question: e.target.value }))
                }
                placeholder="Ketik pertanyaan di sini..."
                className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-y"
              />
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <label className="text-sm font-bold text-gray-700 block mb-2">
                Gambar Soal{" "}
                <span className="font-normal text-gray-400">(opsional)</span>
              </label>
              <ImageUpload
                value={soalForm.questionImage || ""}
                onChange={(v) =>
                  setSoalForm((f) => ({ ...f, questionImage: v }))
                }
              />
            </div>

            <p className="text-xs leading-relaxed text-gray-500">
              Atur bobot nilai setiap pilihan jawaban. Jawaban kosong bernilai 0.
              {soalForm.category !== "TKP" && " Kunci jawaban menentukan status benar/salah; skor mengikuti bobot pilihan yang dipilih."}
            </p>
            {["A", "B", "C", "D", "E"].map((opt, index) => (
              <div
                key={opt}
                className={`border-2 rounded-xl p-3 ${
                  soalForm.category !== "TKP" &&
                  soalForm.correctAnswer === index
                    ? "border-green-400 bg-green-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <label className="text-sm font-bold text-gray-700">
                    Pilihan {opt}
                    {soalForm.category !== "TKP" &&
                      soalForm.correctAnswer === index && (
                        <span className="text-green-600 ml-1.5">Kunci</span>
                      )}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-sm text-violet-600 font-semibold">
                      Bobot:{" "}
                      <input
                        type="number"
                        min={0}
                        max={2147483647}
                        step={1}
                        aria-label={`Bobot pilihan ${opt}`}
                        value={soalForm.tkpValues[index]}
                        onChange={(e) => {
                          const values = [...soalForm.tkpValues];
                          values[index] = Number(e.target.value);
                          setSoalForm((f) => ({ ...f, tkpValues: values }));
                        }}
                        className="w-10 px-1 py-0.5 border border-gray-200 rounded text-xs text-center"
                      />
                    </label>
                    {soalForm.category !== "TKP" &&
                    soalForm.correctAnswer !== index && (
                      <button
                        type="button"
                        onClick={() =>
                          setSoalForm((f) => ({
                            ...f,
                            correctAnswer: index,
                            tkpValues: f.tkpValues.every((value, i) => value === (i === f.correctAnswer ? 1 : 0))
                              ? defaultOptionWeights(f.category, index)
                              : f.tkpValues,
                          }))
                        }
                        className="text-xs text-gray-500 bg-white border border-gray-200 rounded-md px-2 py-1 cursor-pointer"
                      >
                        Jadikan Kunci
                      </button>
                    )}
                  </div>
                </div>
                <input
                  value={soalForm.opts[index] || ""}
                  onChange={(e) => {
                    const opts = [...soalForm.opts];
                    opts[index] = e.target.value;
                    setSoalForm((f) => ({ ...f, opts }));
                  }}
                  placeholder={`Teks pilihan ${opt}`}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm mb-1.5"
                />
                <ImageUpload
                  value={soalForm.optImgs[index] || ""}
                  onChange={(v) => {
                    const optImgs = [...soalForm.optImgs];
                    optImgs[index] = v;
                    setSoalForm((f) => ({ ...f, optImgs }));
                  }}
                />
              </div>
            ))}

            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1.5">
                Pembahasan{" "}
                <span className="font-normal text-gray-400">(opsional)</span>
              </label>
              <textarea
                rows={2}
                value={soalForm.explanation || ""}
                onChange={(e) =>
                  setSoalForm((f) => ({ ...f, explanation: e.target.value }))
                }
                placeholder="Penjelasan jawaban..."
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm resize-y mb-2"
              />
              <ImageUpload
                value={soalForm.explanationImg || ""}
                onChange={(v) =>
                  setSoalForm((f) => ({ ...f, explanationImg: v }))
                }
              />
            </div>

            <Button
              variant="primary"
              onClick={saveSoal}
              disabled={saveQuestionMutation.isPending}
            >
              {saveQuestionMutation.isPending ? "Menyimpan..." : "Simpan Soal"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
