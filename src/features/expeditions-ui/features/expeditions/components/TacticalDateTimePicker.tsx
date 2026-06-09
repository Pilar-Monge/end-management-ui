import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Calendar, Clock, ChevronLeft, ChevronRight, Plus, Minus, Check, X } from "lucide-react";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];


const WEEKDAYS = ["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"];

interface TacticalDatePickerProps {
  value: string; 
  onChange: (date: string) => void;
  minYear?: number;
  maxYear?: number;
}

export function TacticalDatePicker({
  value,
  onChange,
  minYear = 1950,
  maxYear = 2100,
}: TacticalDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  
  useEffect(() => {
    if (!isOpen) {
      setIsMonthOpen(false);
      setIsYearOpen(false);
    }
  }, [isOpen]);

 
  const parseDateStr = (dateStr: string) => {
    const parts = (dateStr || "").split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; 
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return { year, month, day };
      }
    }
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      day: today.getDate(),
    };
  };

  const initialParsed = parseDateStr(value);
  const [currentYear, setCurrentYear] = useState(initialParsed.year);
  const [currentMonth, setCurrentMonth] = useState(initialParsed.month);

  useEffect(() => {
    const parsed = parseDateStr(value);
    setCurrentYear(parsed.year);
    setCurrentMonth(parsed.month);
  }, [value]);

 
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getStartDayOfWeek = (year: number, month: number) => {
  
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  
  const generateCalendarSlots = () => {
    const totalDays = getDaysInMonth(currentYear, currentMonth);
    const startDay = getStartDayOfWeek(currentYear, currentMonth);

    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonth);

    const slots = [];

    
    for (let i = startDay - 1; i >= 0; i--) {
      slots.push({
        day: daysInPrevMonth - i,
        month: prevMonth,
        year: prevMonthYear,
        isCurrentMonth: false,
      });
    }

   
    for (let i = 1; i <= totalDays; i++) {
      slots.push({
        day: i,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
      });
    }

    const remaining = 42 - slots.length;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth - 12 === 0 ? 0 : currentMonth + 1;
    for (let i = 1; i <= remaining; i++) {
      slots.push({
        day: i,
        month: nextMonth,
        year: nextMonthYear,
        isCurrentMonth: false,
      });
    }

    return slots;
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => Math.max(minYear, y - 1));
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => Math.min(maxYear, y + 1));
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number, month: number, year: number) => {
    const formattedMonth = String(month + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    onChange(`${year}-${formattedMonth}-${formattedDay}`);
    setIsOpen(false);
  };

  const handleSetToday = () => {
    const today = new Date();
    const formattedMonth = String(today.getMonth() + 1).padStart(2, "0");
    const formattedDay = String(today.getDate()).padStart(2, "0");
    onChange(`${today.getFullYear()}-${formattedMonth}-${formattedDay}`);
    setIsOpen(false);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "ESTABLECER FECHA";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
    }
    return dateStr;
  };

  
  const yearOptions = [];
  for (let yr = minYear; yr <= maxYear; yr++) {
    yearOptions.push(yr);
  }

  const isSelected = (day: number, month: number, year: number) => {
    const parsed = parseDateStr(value);
    return parsed.day === day && parsed.month === month && parsed.year === year;
  };

  const slots = generateCalendarSlots();

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[#020706] border border-[#67ACA9]/30 hover:border-[#69BFB7]/50 rounded-sm p-2 text-xs font-mono text-[#A4C2C5] focus:outline-none transition-all select-none"
        style={{ cursor: "pointer" }}
      >
        <span>{formatDateDisplay(value)}</span>
        <Calendar className="w-3.5 h-3.5 text-[#69BFB7]" />
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-[2px] transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-[325px] bg-[#020a0a]/98 border border-[#67ACA9]/35 shadow-[0_0_20px_rgba(103,172,169,0.15)] hover:border-[#69BFB7]/50 hover:shadow-[0_0_30px_rgba(105,191,183,0.25)] rounded-sm pt-4 pb-4 pl-6 pr-4 z-50 transition-all text-left overflow-hidden">
            <div className="absolute top-0 left-0 w-[4px] h-full bg-[#69BFB7]" />

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 w-6 h-6 border border-[#67ACA9]/30 hover:border-[#69BFB7] text-[#69BFB7]/80 hover:text-[#69BFB7] rounded hover:bg-[#67ACA9]/10 flex items-center justify-center font-bold text-xs transition-all z-50"
              style={{ cursor: "pointer" }}
              title="Cerrar panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>

          
            <div className="text-[10px] font-black tracking-widest text-[#69BFB7] uppercase font-mono mb-2 pb-1.5 border-b border-[#67ACA9]/20 flex items-center justify-between pr-6">
              <span>[!] REGISTRO DE FECHA</span>
              <span className="text-[8px] text-[#69BFB7] px-1.5 py-0.5 bg-[#67ACA9]/10 rounded border border-[#67ACA9]/15">HUD ALPHA</span>
            </div>

           
            <div className="flex items-center justify-between gap-1 pb-2 border-b border-[#67ACA9]/20 mb-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 flex items-center justify-center border border-[#67ACA9]/30 hover:border-[#69BFB7]/60 hover:bg-[#67ACA9]/10 rounded-sm text-[#69BFB7] hover:text-[#69BFB7] transition-all"
                style={{ cursor: "pointer" }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 relative">
               
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMonthOpen(!isMonthOpen);
                      setIsYearOpen(false);
                    }}
                    className="bg-[#020706] border border-[#67ACA9]/30 hover:border-[#69BFB7]/50 text-[#A4C2C5] hover:text-[#69BFB7] rounded-sm py-0.5 px-2 font-mono text-[10px] uppercase outline-none cursor-pointer tracking-wider flex items-center gap-1 transition-all"
                  >
                    <span>{MONTH_NAMES[currentMonth].slice(0, 3)}</span>
                    <span className="text-[7px] text-[#69BFB7]/70">▼</span>
                  </button>
                  {isMonthOpen && (
                    <div className="absolute left-0 mt-1 w-24 bg-[#030d0d] border border-[#67ACA9] shadow-[0_0_15px_rgba(103,172,169,0.4)] rounded-sm py-1 z-[1100] max-h-36 overflow-y-auto">
                      {MONTH_NAMES.map((mName, idx) => {
                        const isSel = currentMonth === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            ref={isSel ? (el) => {
                              if (el && isMonthOpen) {
                                el.scrollIntoView({ block: "nearest" });
                              }
                            } : null}
                            onClick={() => {
                              setCurrentMonth(idx);
                              setIsMonthOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1 text-[9px] font-mono uppercase transition-all hover:bg-[#67ACA9]/20
                              ${isSel ? "text-[#69BFB7] bg-[#67ACA9]/10 font-bold" : "text-[#A4C2C5]/80"}
                            `}
                            style={{ cursor: "pointer" }}
                          >
                            {mName}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

               
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsYearOpen(!isYearOpen);
                      setIsMonthOpen(false);
                    }}
                    className="bg-[#020706] border border-[#67ACA9]/30 hover:border-[#69BFB7]/50 text-[#A4C2C5] hover:text-[#69BFB7] rounded-sm py-0.5 px-2 font-mono text-[10px] outline-none cursor-pointer text-center flex items-center gap-1 transition-all"
                  >
                    <span>{currentYear}</span>
                    <span className="text-[7px] text-[#69BFB7]/70">▼</span>
                  </button>
                  {isYearOpen && (
                    <div className="absolute right-0 mt-1 w-20 bg-[#030d0d] border border-[#67ACA9] shadow-[0_0_15px_rgba(103,172,169,0.4)] rounded-sm py-1 z-[1100] max-h-36 overflow-y-auto">
                      {yearOptions.map((yr) => {
                        const isSel = currentYear === yr;
                        return (
                          <button
                            key={yr}
                            type="button"
                            ref={isSel ? (el) => {
                              if (el && isYearOpen) {
                                el.scrollIntoView({ block: "nearest" });
                              }
                            } : null}
                            onClick={() => {
                              setCurrentYear(yr);
                              setIsYearOpen(false);
                            }}
                            className={`w-full text-center px-1.5 py-1 text-[9px] font-mono transition-all hover:bg-[#67ACA9]/20
                              ${isSel ? "text-[#69BFB7] bg-[#67ACA9]/10 font-bold" : "text-[#A4C2C5]/80"}
                            `}
                            style={{ cursor: "pointer" }}
                          >
                            {yr}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 flex items-center justify-center border border-[#67ACA9]/30 hover:border-[#69BFB7]/60 hover:bg-[#67ACA9]/10 rounded-sm text-[#69BFB7] hover:text-[#69BFB7] transition-all"
                style={{ cursor: "pointer" }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          
            <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[8px] font-black tracking-widest text-[#69BFB7]/60 font-mono">
              {WEEKDAYS.map((day, idx) => (
                <div key={idx}>{day}</div>
              ))}
            </div>

           
            <div className="grid grid-cols-7 gap-1 font-mono">
              {slots.map((slot, idx) => {
                const active = isSelected(slot.day, slot.month, slot.year);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDay(slot.day, slot.month, slot.year)}
                    className={`h-7 text-[10px] font-bold rounded-sm border transition-all flex items-center justify-center relative
                      ${
                        active
                          ? "bg-[#69BFB7] text-[#020706] border-[#69BFB7] font-extrabold shadow-[0_0_8px_rgba(105,191,183,0.4)]"
                          : slot.isCurrentMonth
                          ? "bg-[#020706]/50 text-[#A4C2C5] border-[#67ACA9]/10 hover:border-[#67ACA9]/50 hover:bg-[#67ACA9]/10 hover:text-[#69BFB7]"
                          : "text-[#A4C2C5]/20 border-transparent hover:border-[#67ACA9]/30"
                      }
                    `}
                    style={{ cursor: "pointer" }}
                  >
                    <span>{slot.day}</span>
                  </button>
                );
              })}
            </div>

            
            <div className="flex items-center justify-between border-t border-[#67ACA9]/20 pt-2 mt-3 text-[9px] font-mono">
              <button
                type="button"
                onClick={handleSetToday}
                className="hover:text-[#69BFB7] border border-[#67ACA9]/25 hover:border-[#69BFB7]/50 bg-[#020706] py-0.5 px-2 rounded-sm transition-all text-[#69BFB7] font-bold uppercase tracking-wider"
                style={{ cursor: "pointer" }}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="hover:text-red-400 border border-[#67ACA9]/20 hover:border-red-400/40 bg-transparent py-0.5 px-2 rounded-sm transition-all text-[#A4C2C5]/60 uppercase tracking-widest"
                style={{ cursor: "pointer" }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

interface TacticalTimePickerProps {
  value: string; 
  onChange: (time: string) => void;
}

export function TacticalTimePicker({ value, onChange }: TacticalTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parseTimeStr = (timeStr: string) => {
    const parts = (timeStr || "08:00").split(":");
    let hour = parseInt(parts[0], 10);
    let minute = parseInt(parts[1], 10);
    if (isNaN(hour)) hour = 8;
    if (isNaN(minute)) minute = 0;
    return { hour, minute };
  };

  const { hour, minute } = parseTimeStr(value);

  const setHour = (h: number) => {
    const formattedH = String(h).padStart(2, "0");
    const formattedM = String(minute).padStart(2, "0");
    onChange(`${formattedH}:${formattedM}`);
  };

  const setMinute = (m: number) => {
    const formattedH = String(hour).padStart(2, "0");
    const formattedM = String(m).padStart(2, "0");
    onChange(`${formattedH}:${formattedM}`);
  };

  const handleIncrementHour = () => {
    setHour((hour + 1) % 24);
  };

  const handleDecrementHour = () => {
    setHour((hour - 1 + 24) % 24);
  };

  const handleIncrementMinute = () => {
    setMinute((minute + 1) % 60);
  };

  const handleDecrementMinute = () => {
    setMinute((minute - 1 + 60) % 60);
  };

  
  const presets = [
    { label: "06:00 (Amanecer)", time: "06:00" },
    { label: "12:00 (Mediodía)", time: "12:00" },
    { label: "18:00 (Crepúsculo)", time: "18:00" },
    { label: "22:00 (Nocturno)", time: "22:00" },
  ];

  
  const hoursGrid = Array.from({ length: 24 }, (_, i) => i);


  const minutesGrid = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="relative w-full" ref={containerRef}>
    
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[#020706] border border-[#67ACA9]/30 hover:border-[#69BFB7]/50 rounded-sm p-2 text-xs font-mono text-[#A4C2C5] focus:outline-none transition-all select-none"
        style={{ cursor: "pointer" }}
      >
        <span>{value || "08:00"} hs</span>
        <Clock className="w-3.5 h-3.5 text-[#69BFB7]" />
      </button>
      {isOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-[2px] transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-[330px] bg-[#020a0a]/98 border border-[#67ACA9]/35 shadow-[0_0_20px_rgba(103,172,169,0.15)] hover:border-[#69BFB7]/50 hover:shadow-[0_0_30px_rgba(105,191,183,0.25)] rounded-sm pt-4 pb-4 pl-6 pr-4 z-50 transition-all font-mono text-left overflow-hidden">
            <div className="absolute top-0 left-0 w-[4px] h-full bg-[#69BFB7]" />
            
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 w-6 h-6 border border-[#67ACA9]/30 hover:border-[#69BFB7] text-[#69BFB7]/80 hover:text-[#69BFB7] rounded hover:bg-[#67ACA9]/10 flex items-center justify-center font-bold text-xs transition-all z-50"
              style={{ cursor: "pointer" }}
              title="Cerrar panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="border-b border-[#67ACA9]/20 pb-1.5 mb-3 text-center flex items-center justify-between pr-6">
              <span className="text-[10px] font-black text-[#69BFB7] tracking-widest uppercase">[!] REGISTRO DE HORA MILITAR</span>
              <span className="text-[10px] font-black text-[#69BFB7] bg-[#67ACA9]/10 px-1.5 py-0.5 rounded border border-[#67ACA9]/15">{String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")} hs</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 bg-black/50 p-2 rounded border border-[#67ACA9]/10">
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-[#69BFB7] font-bold tracking-widest uppercase mb-1">Dígit Hora</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDecrementHour}
                    className="w-6 h-6 flex items-center justify-center border border-[#67ACA9]/30 hover:border-[#69BFB7] rounded hover:bg-[#67ACA9]/10 text-[#69BFB7] transition-all"
                    style={{ cursor: "pointer" }}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-black text-[#F0FAFA] w-6 text-center">
                    {String(hour).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrementHour}
                    className="w-6 h-6 flex items-center justify-center border border-[#67ACA9]/30 hover:border-[#69BFB7] rounded hover:bg-[#67ACA9]/10 text-[#69BFB7] transition-all"
                    style={{ cursor: "pointer" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[8px] text-[#69BFB7] font-bold tracking-widest uppercase mb-1">Dígit Minuto</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDecrementMinute}
                    className="w-6 h-6 flex items-center justify-center border border-[#67ACA9]/30 hover:border-[#69BFB7] rounded hover:bg-[#67ACA9]/10 text-[#69BFB7] transition-all"
                    style={{ cursor: "pointer" }}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-black text-[#F0FAFA] w-6 text-center">
                    {String(minute).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrementMinute}
                    className="w-6 h-6 flex items-center justify-center border border-[#67ACA9]/30 hover:border-[#69BFB7] rounded hover:bg-[#67ACA9]/10 text-[#69BFB7] transition-all"
                    style={{ cursor: "pointer" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <span className="text-[8px] text-[#69BFB7]/80 uppercase block mb-1.5 tracking-wider font-bold">HORA MILITAR PRECEPTOR:</span>
              <div className="grid grid-cols-6 gap-1">
                {hoursGrid.map((hval) => {
                  const isActive = hval === hour;
                  return (
                    <button
                      key={hval}
                      type="button"
                      onClick={() => setHour(hval)}
                      className={`h-5 text-[9px] font-bold rounded-sm border transition-all flex items-center justify-center
                        ${
                          isActive
                            ? "bg-[#69BFB7] text-[#020706] border-[#69BFB7] font-black"
                            : "bg-[#020706]/60 text-[#A4C2C5] border-[#67ACA9]/10 hover:border-[#67ACA9]/40 hover:text-[#69BFB7]"
                        }
                      `}
                      style={{ cursor: "pointer" }}
                    >
                      {String(hval).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-3">
              <span className="text-[8px] text-[#69BFB7]/80 uppercase block mb-1.5 tracking-wider font-bold">MINUTO PRECEPTOR:</span>
              <div className="grid grid-cols-6 gap-1">
                {minutesGrid.map((mval) => {
                  const isActive = mval === minute;
                  return (
                    <button
                      key={mval}
                      type="button"
                      onClick={() => setMinute(mval)}
                      className={`h-5 text-[9px] font-bold rounded-sm border transition-all flex items-center justify-center
                        ${
                          isActive
                            ? "bg-[#69BFB7] text-[#020706] border-[#69BFB7] font-black"
                            : "bg-[#020706]/60 text-[#A4C2C5] border-[#67ACA9]/10 hover:border-[#67ACA9]/40 hover:text-[#69BFB7]"
                        }
                      `}
                      style={{ cursor: "pointer" }}
                    >
                      {String(mval).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#67ACA9]/20 pt-2 mb-2 flex flex-col gap-1">
              <span className="text-[8px] text-[#69BFB7]/70 uppercase tracking-widest font-bold">AJUSTES RECOMENDADOS:</span>
              <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                {presets.map((preset) => {
                  const isMatch = value === preset.time;
                  return (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => onChange(preset.time)}
                      className={`py-1 px-1.5 text-[8px] font-bold uppercase transition-all rounded-sm border select-none
                        ${
                          isMatch
                            ? "bg-[#67ACA9]/20 text-[#69BFB7] border-[#69BFB7]/60"
                            : "bg-[#020706]/40 text-[#A4C2C5]/70 border-[#67ACA9]/15 hover:border-[#67ACA9]/40 hover:text-[#69BFB7]"
                        }
                      `}
                      style={{ cursor: "pointer" }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#67ACA9]/15 pt-2 flex items-center justify-between font-mono text-[9px]">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const hh = String(now.getHours()).padStart(2, "0");
                  const mm = String(now.getMinutes()).padStart(2, "0");
                  onChange(`${hh}:${mm}`);
                }}
                className="hover:text-[#69BFB7] border border-[#67ACA9]/20 hover:border-[#69BFB7]/50 bg-[#020706] py-0.5 px-2 rounded-sm transition-all text-[#69BFB7] font-bold uppercase tracking-wider"
                style={{ cursor: "pointer" }}
              >
                Sincronizar Local
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="hover:text-[#69BFB7] border border-[#67ACA9]/20 hover:border-[#69BFB7]/50 bg-[#020706] py-0.5 px-2.5 rounded-sm transition-all text-[#69BFB7] font-extrabold uppercase flex items-center gap-1 cursor-pointer"
                style={{ cursor: "pointer" }}
              >
                <Check className="w-2.5 h-2.5" /> Aceptar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

