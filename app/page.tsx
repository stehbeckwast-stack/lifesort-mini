"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createWorker } from "tesseract.js";
type Task = {
  id: number;
  title: string;
  project: string;
  priority: string;
  date: string;
  time: string;
  person: string;
  company: string;
  location: string;
  action: string;
  completed: boolean;
  note?: string;
  fileName?: string;
  fileType?: string;
  analysisNote?: string;
  extractedText?: string;
};

type UploadedFile = {
  id: number;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
};

type ActivePanel = "dashboard" | "quick" | "manual" | "files" | "calendar" | "tasks";

export default function Home() {
  const [input, setInput] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState("Alle");
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("Alle");
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [statusText, setStatusText] = useState("Bereit.");
  const [activePanel, setActivePanel] = useState<ActivePanel>("dashboard");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editProject, setEditProject] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editPerson, setEditPerson] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editNote, setEditNote] = useState("");

  const [customProjects, setCustomProjects] = useState<string[]>([
    "Inbox",
    "Haus",
    "Privat",
    "Büro",
  ]);
  const [newProject, setNewProject] = useState("");

  const [manualTitle, setManualTitle] = useState("");
  const [manualProject, setManualProject] = useState("Inbox");
  const [manualPriority, setManualPriority] = useState("Normal");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [manualPerson, setManualPerson] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualNote, setManualNote] = useState("");

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const weekdayWords = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
  ];

  useEffect(() => {
    const saved =
      localStorage.getItem("lifesort-v12") ||
      localStorage.getItem("lifesort-v11") ||
      localStorage.getItem("lifesort-v10.3") ||
      localStorage.getItem("lifesort-v10.2");

    const savedProjects = localStorage.getItem("lifesort-projects");
    const savedFiles = localStorage.getItem("lifesort-files");

    if (saved) setTasks(JSON.parse(saved));
    if (savedProjects) setCustomProjects(JSON.parse(savedProjects));
    if (savedFiles) setUploadedFiles(JSON.parse(savedFiles));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        setStatusText("Service Worker konnte nicht registriert werden.");
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lifesort-v12", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("lifesort-projects", JSON.stringify(customProjects));
  }, [customProjects]);

  useEffect(() => {
    localStorage.setItem("lifesort-files", JSON.stringify(uploadedFiles));
  }, [uploadedFiles]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      setStatusText("Benachrichtigungen werden auf diesem Gerät nicht unterstützt.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      setStatusText("Push-Berechtigung erteilt.");

      new Notification("LifeSort ist bereit", {
        body: "Benachrichtigungen funktionieren auf diesem Gerät.",
        icon: "/icons/lifesort-icon-192.png",
      });
    } else {
      setStatusText("Benachrichtigungen wurden nicht erlaubt.");
    }
  };

  const normalizeInput = (text: string) => {
    return text
      .replace(/smastag/gi, "Samstag")
      .replace(/smatag/gi, "Samstag")
      .replace(/samstg/gi, "Samstag")
      .replace(/freitg/gi, "Freitag")
      .replace(/freitga/gi, "Freitag")
      .replace(/freitah/gi, "Freitag")
      .replace(/montg/gi, "Montag")
      .replace(/dienstg/gi, "Dienstag")
      .replace(/mittwcoh/gi, "Mittwoch")
      .replace(/donnerstg/gi, "Donnerstag")
      .replace(/sonntg/gi, "Sonntag")
      .replace(/dorfne/gi, "Dorfen")
      .replace(/dorfn/gi, "Dorfen")
      .replace(/erdign/gi, "Erding")
      .replace(/pleiskrichen/gi, "Pleiskirchen")
      .replace(/pleiskirchn/gi, "Pleiskirchen")
      .replace(/walpertskirchn/gi, "Walpertskirchen")
      .replace(/berghm/gi, "Bergham");
  };

  const detectDate = (text: string) => {
    const lower = text.toLowerCase();
    let date = "Kein Datum";

    if (lower.includes("heute")) date = "Heute";
    else if (lower.includes("morgen")) date = "Morgen";
    else if (lower.includes("übermorgen")) date = "Übermorgen";
    else if (lower.includes("montag")) date = "Montag";
    else if (lower.includes("dienstag")) date = "Dienstag";
    else if (lower.includes("mittwoch")) date = "Mittwoch";
    else if (lower.includes("donnerstag")) date = "Donnerstag";
    else if (lower.includes("freitag")) date = "Freitag";
    else if (lower.includes("samstag")) date = "Samstag";
    else if (lower.includes("sonntag")) date = "Sonntag";
    else if (lower.includes("kw")) date = "Dieser Monat";
    else if (lower.includes("2026") || lower.includes("2027")) date = "Später";

    const fullDateMatch = text.match(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/);
    const shortDateMatch = text.match(/\b\d{1,2}\.\d{1,2}\b/);

    if (fullDateMatch) date = fullDateMatch[0];
    else if (shortDateMatch) date = shortDateMatch[0];

    return date;
  };

  const detectLocation = (text: string) => {
    const knownLocations = [
      "Dorfen",
      "Schwindegg",
      "Wasentegernbach",
      "Boldenkow",
      "Kreta",
      "Erding",
      "München",
      "Pleiskirchen",
      "Walpertskirchen",
      "Landshut",
      "Mühldorf",
      "Altötting",
      "Taufkirchen",
      "Bergham",
      "Daheim",
      "Vilsbiburg",
    ];

    for (const loc of knownLocations) {
      if (text.toLowerCase().includes(loc.toLowerCase())) return loc;
    }

    const pattern = text.match(
      /\b(?:in|nach|bei|auf)\s+([A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ-]+)/
    );

    if (pattern?.[1]) {
      const candidate = pattern[1];

      const blocked = [
        "Tante",
        "Onkel",
        "Mama",
        "Papa",
        "Oma",
        "Opa",
        "Mittag",
        "Abend",
        "Termin",
      ];

      if (!blocked.includes(candidate)) return candidate;
    }

    return "Kein Ort";
  };
    const detectPerson = (text: string, location: string) => {
    const lower = text.toLowerCase();

    const blocked = [
      "Baustelle",
      "Termin",
      "Treffen",
      "Essen",
      "Mittag",
      "Abend",
      "Heute",
      "Morgen",
      "Freitag",
      "Samstag",
      "Sonntag",
      "Montag",
      "Dienstag",
      "Mittwoch",
      "Donnerstag",
      location,
    ];

    const drMatch = text.match(/\bDr\.?\s+[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ-]+/);
    if (drMatch) return drMatch[0];

    const contactPattern = text.match(
      /\b(?:mit|zu)\s+([A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ-]+)/
    );

    if (contactPattern?.[1]) {
      const candidate = contactPattern[1];
      if (!blocked.includes(candidate) && candidate !== location) return candidate;
    }

    if (lower.includes("bei tante")) return "Tante";
    if (lower.includes("bei onkel")) return "Onkel";
    if (lower.includes("bei mama")) return "Mama";
    if (lower.includes("bei papa")) return "Papa";
    if (lower.includes("bei oma")) return "Oma";
    if (lower.includes("bei opa")) return "Opa";

    return "Keine Person";
  };

  const parseTask = (rawText: string): Task => {
    const text = normalizeInput(rawText.trim());
    const lower = text.toLowerCase();

    let priority = "Normal";

    if (
      lower.includes("dringend") ||
      lower.includes("wichtig") ||
      lower.includes("heute")
    ) {
      priority = "Hoch";
    } else if (
      lower.includes("morgen") ||
      lower.includes("freitag") ||
      lower.includes("samstag") ||
      lower.includes("termin")
    ) {
      priority = "Mittel";
    }

    const date = detectDate(text);

    const timeMatch = text.match(/\b([0-2]?\d[:.]?\d{0,2})\s*uhr\b/i);
    let time = "Keine Uhrzeit";

    if (timeMatch) {
      time = `${timeMatch[1].replace(".", ":")} Uhr`;
    }

    const location = detectLocation(text);
    const person = detectPerson(text, location);

    let action = "Aufgabe";

    if (lower.includes("termin") && lower.includes("baustelle")) {
      action = "Baustellentermin";
    } else if (lower.includes("termin")) {
      action = "Termin";
    } else if (
      lower.includes("anrufen") ||
      lower.includes("rückruf") ||
      lower.includes("zurückrufen")
    ) {
      action = "Telefonat";
    } else if (
      lower.includes("doktor") ||
      lower.includes("arzt") ||
      lower.includes("zahnarzt")
    ) {
      action = "Arzt / Gesundheit";
    } else if (lower.includes("baustelle")) {
      action = "Baustelle";
    } else if (lower.includes("besprechung") || lower.includes("planung")) {
      action = "Besprechung";
    } else if (lower.includes("einkauf")) {
      action = "Einkauf";
    } else if (
      lower.includes("essen") ||
      lower.includes("mittag") ||
      lower.includes("abend") ||
      lower.includes("tante")
    ) {
      action = "Privat";
    }

    let project = "Inbox";

    customProjects.forEach((p) => {
      if (text.toLowerCase().includes(p.toLowerCase())) project = p;
    });

    if (project === "Inbox") {
      if (lower.includes("baustelle") || lower.includes("haus")) project = "Haus";

      if (
        lower.includes("arzt") ||
        lower.includes("zahnarzt") ||
        lower.includes("tante") ||
        lower.includes("onkel") ||
        lower.includes("urlaub")
      ) {
        project = "Privat";
      }

      if (lower.includes("rechnung") || lower.includes("angebot")) project = "Büro";
    }

    return {
      id: Date.now() + Math.random(),
      title: text,
      project,
      priority,
      date,
      time,
      person,
      company: "Keine Firma",
      location,
      action,
      completed: false,
      note: "",
    };
  };

  const getNextWeekdayDate = (weekday: string) => {
    const weekdayIndex: Record<string, number> = {
      Sonntag: 0,
      Montag: 1,
      Dienstag: 2,
      Mittwoch: 3,
      Donnerstag: 4,
      Freitag: 5,
      Samstag: 6,
    };

    const today = new Date();
    const target = weekdayIndex[weekday];
    const current = today.getDay();

    let diff = target - current;
    if (diff <= 0) diff += 7;

    const result = new Date(today);
    result.setDate(today.getDate() + diff);

    return result;
  };

  const getCalendarDate = (task: Task) => {
    const now = new Date();
    let date = new Date(now);

    if (task.date === "Heute") {
      date = new Date(now);
    } else if (task.date === "Morgen") {
      date.setDate(now.getDate() + 1);
    } else {
      const weekday = weekdayWords.find((day) => task.date.includes(day));
      if (weekday) date = getNextWeekdayDate(weekday);
    }

    const dateMatch = task.date.match(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?\b/);

    if (dateMatch) {
      const day = Number(dateMatch[1]);
      const month = Number(dateMatch[2]) - 1;
      const year = dateMatch[3] ? Number(dateMatch[3]) : now.getFullYear();
      date = new Date(year, month, day);
    }

    let hour = 9;
    let minute = 0;

    const timeMatch = task.time.match(/(\d{1,2})(?::(\d{2}))?/);

    if (timeMatch) {
      hour = Number(timeMatch[1]);
      minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
    }

    date.setHours(hour, minute, 0, 0);

    return date;
  };

  const formatICSDate = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");

    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
      date.getDate()
    )}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
  };

  const createCalendarFile = async (task: Task) => {
    const start = getCalendarDate(task);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    const cleanTitle = task.title.replace(/[,;]/g, "");
    const cleanLocation = task.location === "Kein Ort" ? "" : task.location;

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//LifeSort Mini//DE",
      "BEGIN:VEVENT",
      `UID:${task.id}@lifesort-mini`,
      `SUMMARY:${cleanTitle}`,
      `LOCATION:${cleanLocation}`,
      `DESCRIPTION:Projekt: ${task.project}\\nKontakt: ${task.person}\\nAktion: ${task.action}\\nNotiz: ${task.note || ""}`,
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });

    const file = new File([blob], `${cleanTitle || "lifesort-termin"}.ics`, {
      type: "text/calendar",
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: cleanTitle,
        text: "Kalendereintrag aus LifeSort Mini",
      });

      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${cleanTitle || "lifesort-termin"}.ics`;
    link.click();

    URL.revokeObjectURL(url);
    setStatusText("Kalendereintrag wurde erstellt. Prüfe Downloads oder Kalender-App.");
  };

  const handleAnalyze = () => {
    const textarea = document.getElementById(
      "quick-input"
    ) as HTMLTextAreaElement | null;

    const currentInput = textarea?.value || input;

    if (!currentInput.trim()) {
      setStatusText("Keine Eingabe erkannt.");
      return;
    }

    const splitTasks = currentInput
      .split(",")
      .map((taskText) => taskText.trim())
      .filter(Boolean);

    const newTasks = splitTasks.map(parseTask);

    setTasks((prev) => [...newTasks, ...prev]);
    setSelectedProject("Alle");
    setQuickFilter("Alle");
    setSearch("");
    setInput("");

    if (textarea) textarea.value = "";

    setStatusText(`${newTasks.length} Aufgabe(n) erstellt.`);
    setActivePanel("tasks");
  };

  const handleManualAdd = () => {
    if (!manualTitle.trim()) {
      setStatusText("Manuell: Kein Titel erkannt.");
      return;
    }

    const newTask: Task = {
      id: Date.now() + Math.random(),
      title: manualTitle,
      project: manualProject,
      priority: manualPriority,
      date: manualDate || "Kein Datum",
      time: manualTime || "Keine Uhrzeit",
      person: manualPerson || "Keine Person",
      company: manualCompany || "Keine Firma",
      location: manualLocation || "Kein Ort",
      action: "Manuell",
      completed: false,
      note: manualNote,
    };

    setTasks((prev) => [newTask, ...prev]);
    setSelectedProject("Alle");
    setQuickFilter("Alle");
    setSearch("");

    setManualTitle("");
    setManualProject("Inbox");
    setManualPriority("Normal");
    setManualDate("");
    setManualTime("");
    setManualPerson("");
    setManualCompany("");
    setManualLocation("");
    setManualNote("");

    setStatusText("Manuelle Aufgabe erstellt.");
    setActivePanel("tasks");
  };

  const handleCreateProject = () => {
    const clean = newProject.trim();

    if (!clean) return;

    if (!customProjects.includes(clean)) {
      setCustomProjects((prev) => [...prev, clean]);
      setStatusText(`Projekt "${clean}" erstellt.`);
    }

    setNewProject("");
  };
const readImageWithTesseract = async (file: File) => {
  if (!file.type.startsWith("image/")) return "";

  try {
    setAnalysisStatus("Bild wird mit OCR ausgelesen...");

    const worker = await createWorker("deu");

    const result = await worker.recognize(file);

    await worker.terminate();

    return result.data.text || "";
  } catch {
    return "";
  }
};
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setAnalysisStatus("Datei wird ausgelesen und analysiert...");

    const fileArray = Array.from(files);

    const newFiles: UploadedFile[] = fileArray.map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: file.type || "Unbekannt",
      size: file.size,
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));

    setUploadedFiles((prev) => [...newFiles, ...prev]);

    const generatedTasks: Task[] = [];

    for (const file of fileArray) {
  try {
    const ocrText = await readImageWithTesseract(file);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("ocrText", ocrText);

    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

        generatedTasks.push({
          id: Date.now() + Math.random(),
          title: result?.task?.title || `Datei prüfen: ${file.name.slice(0, 18)}...`,
          project: result?.task?.project || "Inbox",
          priority: result?.task?.priority || "Normal",
          date: result?.task?.date || "Kein Datum",
          time: result?.task?.time || "Keine Uhrzeit",
          person: result?.task?.person || "Keine Person",
          company: result?.task?.company || "Keine Firma",
          location: result?.task?.location || "Kein Ort",
          action: result?.task?.action || "Datei prüfen",
          completed: false,
          note: "Aus Datei/Kamera erstellt.",
          fileName: file.name,
          fileType: file.type,
          analysisNote: result?.note || "Datei wurde analysiert.",
         extractedText: result?.extractedText || ocrText || "",
        });
      } catch {
        generatedTasks.push({
          id: Date.now() + Math.random(),
          title: `Datei prüfen: ${file.name.slice(0, 18)}...`,
          project: "Inbox",
          priority: "Normal",
          date: "Kein Datum",
          time: "Keine Uhrzeit",
          person: "Keine Person",
          company: "Keine Firma",
          location: "Kein Ort",
          action: "Datei prüfen",
          completed: false,
          note: "Analyse nicht möglich.",
          fileName: file.name,
          fileType: file.type,
          analysisNote: "Analyse nicht möglich. Standardaufgabe erstellt.",
          extractedText: "",
        });
      }
    }

    setTasks((prev) => [...generatedTasks, ...prev]);

    setAnalysisStatus(
      `${generatedTasks.length} Aufgabe(n) aus Datei/Kamera erstellt.`
    );

    setActivePanel("tasks");
  };
    const deleteUploadedFile = (id: number) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const toggleCompleted = (id: number) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDate(task.date);
    setEditTime(task.time);
    setEditProject(task.project);
    setEditPriority(task.priority);
    setEditPerson(task.person);
    setEditLocation(task.location);
    setEditNote(task.note || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDate("");
    setEditTime("");
    setEditProject("");
    setEditPriority("");
    setEditPerson("");
    setEditLocation("");
    setEditNote("");
  };

  const saveEdit = (id: number) => {
    if (!editTitle.trim()) return;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              title: editTitle,
              date: editDate,
              time: editTime,
              project: editProject,
              priority: editPriority,
              person: editPerson,
              location: editLocation,
              note: editNote,
            }
          : task
      )
    );

    cancelEdit();
  };

  const projects = [
    "Alle",
    ...Array.from(new Set([...customProjects, ...tasks.map((t) => t.project)])),
  ];

  const searchedTasks = tasks.filter((task) => {
    if (!search.trim()) return true;

    const searchLower = search.toLowerCase();

    return (
      task.title.toLowerCase().includes(searchLower) ||
      task.project.toLowerCase().includes(searchLower) ||
      task.priority.toLowerCase().includes(searchLower) ||
      task.date.toLowerCase().includes(searchLower) ||
      task.time.toLowerCase().includes(searchLower) ||
      task.person.toLowerCase().includes(searchLower) ||
      task.company.toLowerCase().includes(searchLower) ||
      task.location.toLowerCase().includes(searchLower) ||
      task.action.toLowerCase().includes(searchLower) ||
      (task.note || "").toLowerCase().includes(searchLower) ||
      (task.fileName || "").toLowerCase().includes(searchLower)
    );
  });

  const quickFilteredTasks = searchedTasks.filter((task) => {
    if (quickFilter === "Alle") return true;
    if (quickFilter === "Offen") return !task.completed;
    if (quickFilter === "Erledigt") return task.completed;
    if (quickFilter === "Heute") return task.date === "Heute";
    if (quickFilter === "Wichtig") return task.priority === "Hoch";
    if (quickFilter === "Telefonate") return task.action === "Telefonat";
    if (quickFilter === "Termine") {
      return task.action === "Termin" || task.action === "Baustellentermin";
    }
    if (quickFilter === "Dateien") return Boolean(task.fileName);

    return true;
  });

  const filteredTasks =
    selectedProject === "Alle"
      ? quickFilteredTasks
      : quickFilteredTasks.filter((task) => task.project === selectedProject);

  const getTimeGroup = (task: Task) => {
    if (task.date === "Heute") return "Heute";
    if (task.date === "Morgen") return "Morgen";

    const hasWeekday = weekdayWords.some((day) => task.date.includes(day));

    if (hasWeekday || task.date.includes("Übermorgen")) return "Diese Woche";

    if (task.date === "Dieser Monat" || /\d{1,2}\.\d{1,2}/.test(task.date)) {
      return "Dieser Monat";
    }

    if (task.date === "Kein Datum" && task.time !== "Keine Uhrzeit") {
      return "Ohne Datum";
    }

    return "Später";
  };

  const groupedTasks = useMemo(() => {
    return {
      Heute: filteredTasks.filter((task) => getTimeGroup(task) === "Heute"),
      Morgen: filteredTasks.filter((task) => getTimeGroup(task) === "Morgen"),
      "Diese Woche": filteredTasks.filter(
        (task) => getTimeGroup(task) === "Diese Woche"
      ),
      "Dieser Monat": filteredTasks.filter(
        (task) => getTimeGroup(task) === "Dieser Monat"
      ),
      "Ohne Datum": filteredTasks.filter(
        (task) => getTimeGroup(task) === "Ohne Datum"
      ),
      Später: filteredTasks.filter((task) => getTimeGroup(task) === "Später"),
    };
  }, [filteredTasks]);

  const getPriorityColor = (priority: string) => {
    if (priority === "Hoch") return "text-red-400";
    if (priority === "Mittel") return "text-yellow-400";
    return "text-blue-400";
  };

  const getCardStyle = (priority: string, completed: boolean) => {
    if (completed) return "bg-zinc-950 border-zinc-900 opacity-50 grayscale";
    if (priority === "Hoch") return "bg-red-950/30 border-red-700";
    if (priority === "Mittel") return "bg-yellow-950/10 border-yellow-700";
    return "bg-black border-zinc-800";
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const navButtonClass = (panel: ActivePanel) =>
    activePanel === panel
      ? "bg-white text-black"
      : "bg-zinc-800 text-white";

  const openPanel = (panel: ActivePanel) => {
    setActivePanel(panel);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const todayCount = tasks.filter((task) => getTimeGroup(task) === "Heute").length;
  const tomorrowCount = tasks.filter((task) => getTimeGroup(task) === "Morgen").length;
  const openCount = tasks.filter((task) => !task.completed).length;
  const fileCount = tasks.filter((task) => task.fileName).length;

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-10 pb-32">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold">LifeSort Mini V12</h1>
          <p className="text-zinc-400 mt-2">
            Kamera, Push-Test, Kalenderbereich und kompaktere Navigation.
          </p>
        </div>

        <div className="sticky top-0 z-20 bg-black/90 backdrop-blur py-3">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <button
              type="button"
              onClick={() => openPanel("dashboard")}
              className={`${navButtonClass("dashboard")} rounded-2xl py-3 font-semibold`}
            >
              Übersicht
            </button>

            <button
              type="button"
              onClick={() => openPanel("quick")}
              className={`${navButtonClass("quick")} rounded-2xl py-3 font-semibold`}
            >
              Schnell
            </button>

            <button
              type="button"
              onClick={() => openPanel("manual")}
              className={`${navButtonClass("manual")} rounded-2xl py-3 font-semibold`}
            >
              Manuell
            </button>

            <button
              type="button"
              onClick={() => openPanel("files")}
              className={`${navButtonClass("files")} rounded-2xl py-3 font-semibold`}
            >
              Kamera
            </button>

            <button
              type="button"
              onClick={() => openPanel("calendar")}
              className={`${navButtonClass("calendar")} rounded-2xl py-3 font-semibold`}
            >
              Kalender
            </button>

            <button
              type="button"
              onClick={() => openPanel("tasks")}
              className={`${navButtonClass("tasks")} rounded-2xl py-3 font-semibold`}
            >
              Aufgaben
            </button>
          </div>
        </div>

        {activePanel === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => openPanel("tasks")}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 text-left"
              >
                <p className="text-zinc-400">Offen</p>
                <h2 className="text-5xl font-bold mt-2">{openCount}</h2>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("Heute");
                  openPanel("tasks");
                }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 text-left"
              >
                <p className="text-zinc-400">Heute</p>
                <h2 className="text-5xl font-bold mt-2">{todayCount}</h2>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("Alle");
                  openPanel("tasks");
                }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 text-left"
              >
                <p className="text-zinc-400">Morgen</p>
                <h2 className="text-5xl font-bold mt-2">{tomorrowCount}</h2>
              </button>

              <button
                onClick={() => {
                  setQuickFilter("Dateien");
                  openPanel("tasks");
                }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 text-left"
              >
                <p className="text-zinc-400">Dateien</p>
                <h2 className="text-5xl font-bold mt-2">{fileCount}</h2>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => openPanel("quick")}
                className="bg-white text-black rounded-3xl p-6 text-left font-bold text-2xl"
              >
                + Neue Aufgabe
              </button>

              <button
                onClick={() => openPanel("files")}
                className="bg-blue-700 rounded-3xl p-6 text-left font-bold text-2xl"
              >
                Kamera / PDF erfassen
              </button>

              <button
                onClick={requestNotificationPermission}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-left font-bold text-2xl"
              >
                Push testen
              </button>

              <button
                onClick={() => openPanel("calendar")}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-left font-bold text-2xl"
              >
                Kalender öffnen
              </button>
            </div>

            <p className="text-blue-300">Status: {statusText}</p>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-6">
          <input
            className="w-full bg-black border border-zinc-800 rounded-2xl p-4"
            placeholder="Suche nach Aufgabe, Projekt, Kontakt, Ort oder Datei..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-6">
          <p className="text-zinc-400 mb-4">Schnellfilter</p>

          <div className="flex gap-3 flex-wrap">
            {[
              "Alle",
              "Offen",
              "Erledigt",
              "Heute",
              "Wichtig",
              "Telefonate",
              "Termine",
              "Dateien",
            ].map((filter) => (
              <button
                key={filter}
                onClick={() => setQuickFilter(filter)}
                className={`px-5 py-3 rounded-full transition ${
                  quickFilter === filter
                    ? "bg-white text-black"
                    : "bg-zinc-800 text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {activePanel === "quick" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleAnalyze();
            }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-6"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Schnellerfassung
            </h2>

            <textarea
              id="quick-input"
              className="w-full h-36 md:h-44 bg-black border border-zinc-800 rounded-2xl p-4 mt-4"
              placeholder="Beispiel: Robert Freitag 14 Uhr in Dorfen anrufen..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />

            <button
              type="submit"
              className="mt-5 w-full md:w-auto bg-white text-black px-6 py-4 rounded-2xl font-semibold text-lg active:scale-95"
            >
              Automatisch erkennen
            </button>

            <p className="mt-4 text-sm text-blue-300">Status: {statusText}</p>
          </form>
        )}

        {activePanel === "files" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Kamera / Dateien / PDFs
            </h2>

            <p className="text-zinc-400 mb-5">
              Am Handy kann direkt die Kamera geöffnet werden. PDFs werden
              serverseitig ausgelesen. Foto-OCR ist vorbereitet, echte Bild-OCR
              folgt im nächsten KI-Schritt.
            </p>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              multiple
              onChange={(event) => handleFileUpload(event.target.files)}
              className="hidden"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="bg-white text-black rounded-3xl p-6 font-bold text-xl"
              >
                Kamera öffnen / Zettel scannen
              </button>

              <label className="bg-blue-700 rounded-3xl p-6 font-bold text-xl text-center cursor-pointer">
                PDF / Datei wählen
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={(event) => handleFileUpload(event.target.files)}
                  className="hidden"
                />
              </label>
            </div>

            {analysisStatus && (
              <p className="text-blue-300 mt-4">{analysisStatus}</p>
            )}

            {uploadedFiles.length > 0 && (
              <div className="mt-6 space-y-4">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="bg-black border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div className="flex gap-4">
                      {file.previewUrl ? (
                        <img
                          src={file.previewUrl}
                          alt={file.name}
                          className="w-20 h-20 object-cover rounded-xl border border-zinc-800"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-400">
                          PDF
                        </div>
                      )}

                      <div>
                        <h3 className="text-xl font-bold">{file.name}</h3>
                        <p className="text-zinc-400">{file.type}</p>
                        <p className="text-zinc-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteUploadedFile(file.id)}
                      className="text-red-400 text-left md:text-right"
                    >
                      Datei entfernen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activePanel === "calendar" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Kalender</h2>

            <p className="text-zinc-400 mb-5">
              Termine und Aufgaben mit Datum/Uhrzeit können als Kalendereintrag
              exportiert werden.
            </p>

            <div className="space-y-4">
              {tasks
                .filter((task) => task.time !== "Keine Uhrzeit")
                .map((task) => (
                  <div
                    key={task.id}
                    className="bg-black border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div>
                      <h3 className="text-xl font-bold">{task.title}</h3>
                      <p className="text-zinc-400">
                        {task.date} • {task.time} • {task.location}
                      </p>
                    </div>

                    <button
                      onClick={() => createCalendarFile(task)}
                      className="bg-green-700 px-5 py-3 rounded-xl font-semibold"
                    >
                      Zum Kalender
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activePanel === "manual" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Manuelle Eingabe
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <input
                className="bg-black border border-zinc-800 rounded-xl p-4"
                placeholder="Titel"
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
              />

              <select
                className="bg-black border border-zinc-800 rounded-xl p-4"
                value={manualProject}
                onChange={(event) => setManualProject(event.target.value)}
              >
                {customProjects.map((project) => (
                  <option key={project}>{project}</option>
                ))}
              </select>

              <select
                className="bg-black border border-zinc-800 rounded-xl p-4"
                value={manualPriority}
                onChange={(event) => setManualPriority(event.target.value)}
              >
                <option>Normal</option>
                <option>Mittel</option>
                <option>Hoch</option>
              </select>

              <input
                className="bg-black border border-zinc-800 rounded-xl p-4"
                placeholder="Datum"
                value={manualDate}
                onChange={(event) => setManualDate(event.target.value)}
              />

              <input
                className="bg-black border border-zinc-800 rounded-xl p-4"
                placeholder="Uhrzeit"
                value={manualTime}
                onChange={(event) => setManualTime(event.target.value)}
              />

              <input
                className="bg-black border border-zinc-800 rounded-xl p-4"
                placeholder="Kontakt"
                value={manualPerson}
                onChange={(event) => setManualPerson(event.target.value)}
              />

              <input
                className="bg-black border border-zinc-800 rounded-xl p-4"
                placeholder="Firma"
                value={manualCompany}
                onChange={(event) => setManualCompany(event.target.value)}
              />

              <input
                className="bg-black border border-zinc-800 rounded-xl p-4"
                placeholder="Ort"
                value={manualLocation}
                onChange={(event) => setManualLocation(event.target.value)}
              />

              <textarea
                className="bg-black border border-zinc-800 rounded-xl p-4 md:col-span-2"
                placeholder="Notiz"
                value={manualNote}
                onChange={(event) => setManualNote(event.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleManualAdd}
              className="mt-5 w-full md:w-auto bg-white text-black px-6 py-4 rounded-2xl font-semibold text-lg active:scale-95"
            >
              Manuell hinzufügen
            </button>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Projekte / Boxen
          </h2>

          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <input
              className="flex-1 bg-black border border-zinc-800 rounded-xl p-4"
              placeholder="Neues Projekt / neue Box"
              value={newProject}
              onChange={(event) => setNewProject(event.target.value)}
            />

            <button
              type="button"
              onClick={handleCreateProject}
              className="bg-blue-700 px-6 py-4 rounded-2xl font-semibold text-lg active:scale-95"
            >
              Erstellen
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-6">
          <p className="text-zinc-400 mb-4">Projektfilter</p>

          <div className="flex gap-3 flex-wrap">
            {projects.map((project) => (
              <button
                key={project}
                onClick={() => setSelectedProject(project)}
                className={`px-5 py-3 rounded-full transition ${
                  selectedProject === project
                    ? "bg-white text-black"
                    : "bg-blue-900 text-white"
                }`}
              >
                {project}
              </button>
            ))}
          </div>
        </div>

        {activePanel === "tasks" && (
          <>
            {Object.entries(groupedTasks).map(([groupName, groupTasks]) => {
              if (groupTasks.length === 0) return null;

              return (
                <div
                  key={groupName}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-8"
                >
                  <h2 className="text-4xl md:text-5xl font-bold">{groupName}</h2>

                  <p className="text-zinc-400 mt-2 mb-6">
                    {groupTasks.length} Aufgabe(n)
                  </p>

                  <div className="space-y-5">
                    {groupTasks.map((task) => {
                      const expanded = expandedId === task.id;
                      const editing = editingId === task.id;

                      return (
                        <div
                          key={task.id}
                          className={`border rounded-3xl p-4 md:p-6 transition-all ${getCardStyle(
                            task.priority,
                            task.completed
                          )}`}
                        >
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex gap-5 flex-1">
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => toggleCompleted(task.id)}
                                className="mt-2 w-6 h-6 accent-green-500"
                              />

                              <div className="flex-1">
                                {editing ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <textarea
                                      value={editTitle}
                                      onChange={(event) =>
                                        setEditTitle(event.target.value)
                                      }
                                      className="md:col-span-2 w-full h-24 bg-black border border-zinc-700 rounded-2xl p-4"
                                    />

                                    <input
                                      value={editDate}
                                      onChange={(event) =>
                                        setEditDate(event.target.value)
                                      }
                                      className="bg-black border border-zinc-700 rounded-xl p-3"
                                    />

                                    <input
                                      value={editTime}
                                      onChange={(event) =>
                                        setEditTime(event.target.value)
                                      }
                                      className="bg-black border border-zinc-700 rounded-xl p-3"
                                    />

                                    <select
                                      value={editProject}
                                      onChange={(event) =>
                                        setEditProject(event.target.value)
                                      }
                                      className="bg-black border border-zinc-700 rounded-xl p-3"
                                    >
                                      {customProjects.map((project) => (
                                        <option key={project}>{project}</option>
                                      ))}
                                    </select>

                                    <select
                                      value={editPriority}
                                      onChange={(event) =>
                                        setEditPriority(event.target.value)
                                      }
                                      className="bg-black border border-zinc-700 rounded-xl p-3"
                                    >
                                      <option>Normal</option>
                                      <option>Mittel</option>
                                      <option>Hoch</option>
                                    </select>

                                    <input
                                      value={editPerson}
                                      onChange={(event) =>
                                        setEditPerson(event.target.value)
                                      }
                                      className="bg-black border border-zinc-700 rounded-xl p-3"
                                    />

                                    <input
                                      value={editLocation}
                                      onChange={(event) =>
                                        setEditLocation(event.target.value)
                                      }
                                      className="bg-black border border-zinc-700 rounded-xl p-3"
                                    />

                                    <textarea
                                      value={editNote}
                                      onChange={(event) =>
                                        setEditNote(event.target.value)
                                      }
                                      className="md:col-span-2 bg-black border border-zinc-700 rounded-xl p-3"
                                      placeholder="Notiz"
                                    />

                                    <div className="md:col-span-2 flex gap-3 flex-wrap">
                                      <button
                                        onClick={() => saveEdit(task.id)}
                                        className="bg-green-600 px-5 py-2 rounded-xl font-semibold"
                                      >
                                        Speichern
                                      </button>

                                      <button
                                        onClick={cancelEdit}
                                        className="bg-zinc-700 px-5 py-2 rounded-xl font-semibold"
                                      >
                                        Abbrechen
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <h3
                                      className={`text-2xl md:text-3xl font-bold break-words overflow-hidden ${
                                        task.completed
                                          ? "line-through text-zinc-500"
                                          : ""
                                      }`}
                                    >
                                      {task.title}
                                    </h3>

                                    <p className="text-zinc-400 mt-2">
                                      {task.date} • {task.time} • {task.project} •{" "}
                                      <span
                                        className={getPriorityColor(task.priority)}
                                      >
                                        {task.priority}
                                      </span>
                                    </p>
                                  </>
                                )}

                                {expanded && !editing && (
                                  <div className="mt-5 space-y-2 text-lg md:text-xl">
                                    <p>Aktion: {task.action}</p>
                                    <p>Kontakt: {task.person}</p>
                                    <p>Ort: {task.location}</p>

                                    {task.note && <p>Notiz: {task.note}</p>}

                                    {task.fileName && (
  <p className="break-words text-sm md:text-base">
    Datei: {task.fileName.length > 24 ? task.fileName.slice(0, 24) + "..." : task.fileName}
  </p>
)}

                                    {task.analysisNote && (
                                      <p className="text-blue-300">
                                        Analyse: {task.analysisNote}
                                      </p>
                                    )}

                                    {task.extractedText && (
                                      <details className="mt-4">
                                        <summary className="cursor-pointer text-green-400">
                                          Ausgelesenen PDF-Text anzeigen
                                        </summary>
                                        <pre className="mt-3 whitespace-pre-wrap text-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-4 max-h-80 overflow-auto">
                                          {task.extractedText}
                                        </pre>
                                      </details>
                                    )}

                                    <p>
                                      Status:{" "}
                                      {task.completed ? "erledigt" : "offen"}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-row md:flex-col flex-wrap gap-3 text-left md:text-right">
                              <button
                                onClick={() => startEdit(task)}
                                className="text-purple-400"
                              >
                                Bearbeiten
                              </button>

                              <button
                                onClick={() =>
                                  setExpandedId(expanded ? null : task.id)
                                }
                                className="text-blue-400"
                              >
                                {expanded ? "Weniger" : "Details"}
                              </button>

                              <button
                                onClick={() => createCalendarFile(task)}
                                className="text-green-400"
                              >
                                Kalender
                              </button>

                              <button
                                onClick={() => toggleCompleted(task.id)}
                                className="text-yellow-400"
                              >
                                Status wechseln
                              </button>

                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-red-400"
                              >
                                Löschen
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}

        <button
          type="button"
          onClick={() => openPanel("quick")}
          className="fixed bottom-6 right-6 z-50 bg-white text-black w-16 h-16 rounded-full text-4xl font-bold shadow-xl active:scale-95 md:hidden"
        >
          +
        </button>
      </div>
    </main>
  );
}