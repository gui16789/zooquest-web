import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, Shield, LogIn, Users, BookOpen, Calculator, Languages, ArrowRight, ShieldCheck } from "lucide-react";
import { getAuthedUser } from "@/infra/auth/session";

export const dynamic = "force-dynamic";

const SQUADS = [
  {
    id: "chinese",
    name: "朱迪 & 尼克",
    nameEn: "Judy Hopps & Nick Wilde",
    subject: "语文",
    subjectEn: "Chinese",
    color: "red",
    icon: BookOpen,
    gradient: "from-red-400 to-orange-500",
    description: "充满活力的二人组！让我们一起在汉字的海洋里破案，快乐学习！",
  },
  {
    id: "math",
    name: "牛局长",
    nameEn: "Chief Bogo",
    subject: "数学",
    subjectEn: "Math",
    color: "blue",
    icon: Calculator,
    gradient: "from-blue-400 to-cyan-500",
    description: "严肃但可靠。加入我的队伍，用严密的逻辑和数字解决每一个难题！",
  },
  {
    id: "english",
    name: "夏奇羊",
    nameEn: "Gazelle",
    subject: "英语",
    subjectEn: "English",
    color: "purple",
    icon: Languages,
    gradient: "from-purple-400 to-pink-500",
    description: "像大明星一样闪耀！在美妙的旋律中轻松掌握英语，自信开口！",
  },
];

export default async function Home() {
  const user = await getAuthedUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-slate-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-full bg-blue-100 text-blue-600">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">
              疯狂动物城警校
              <span className="hidden sm:inline font-normal opacity-70 ml-2">(Zootopia Academy)</span>
            </h2>
          </div>
          <Link
            href="/login"
            className="flex items-center justify-center h-10 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-lg shadow-blue-500/30"
          >
            <LogIn className="w-4 h-4 mr-2" />
            <span>登录</span>
          </Link>
        </div>
      </header>

      <main className="flex-grow flex flex-col">
        {/* Hero Section */}
        <div className="relative w-full px-4 sm:px-6 py-6 lg:py-10 flex justify-center">
          <div className="w-full max-w-7xl rounded-3xl overflow-hidden relative min-h-[500px] flex items-center justify-center text-center shadow-2xl">
            {/* Background with gradient */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />
              {/* Decorative circles */}
              <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute bottom-20 right-20 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl" />
              <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-purple-400/20 rounded-full blur-2xl" />
            </div>

            <div className="relative z-10 p-6 flex flex-col items-center max-w-3xl">
              {/* Badge */}
              <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-bold shadow-sm">
                <GraduationCap className="w-5 h-5" />
                <span>2年级中文复习</span>
                <span className="opacity-80 font-normal">(Grade 2 Review)</span>
              </div>

              {/* Main Title */}
              <h1 className="text-white text-5xl md:text-6xl font-black leading-tight tracking-tight mb-4 drop-shadow-lg">
                欢迎加入
                <br />
                <span className="text-blue-600 bg-white px-4 rounded-lg box-decoration-clone inline-block mt-2 transform -rotate-1">
                  疯狂动物城警校！
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-slate-100 text-lg md:text-xl font-medium mb-10 max-w-2xl drop-shadow-md">
                和朱迪、尼克一起学习中文，挑战任务，成为最棒的警官！
                <br />
                <span className="text-base opacity-90 font-normal block mt-2">
                  (Study Chinese with Judy & Nick, complete missions, and become the best officer!)
                </span>
              </p>

              {/* CTA Button */}
              <Link
                href="/login"
                className="group flex items-center justify-center h-14 px-10 rounded-full bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95 text-white text-lg font-bold transition-all shadow-xl shadow-blue-900/50 border-4 border-blue-400/30"
              >
                <ShieldCheck className="w-6 h-6 mr-2 group-hover:animate-bounce" />
                <span>加入警局</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Squads Section */}
        <div className="w-full px-6 py-8 flex justify-center">
          <div className="max-w-7xl w-full flex flex-col">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 px-2 border-b border-slate-200 pb-6">
              <div>
                <div className="text-blue-600 font-bold text-sm tracking-widest uppercase mb-1">
                  Squad Mentors
                </div>
                <h2 className="text-slate-900 text-3xl font-bold leading-tight flex items-center gap-3">
                  <Users className="w-10 h-10 text-yellow-500" />
                  认识你的小队导师
                </h2>
              </div>
            </div>

            {/* Squad Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {SQUADS.map((squad) => {
                const Icon = squad.icon;
                return (
                  <div
                    key={squad.id}
                    className="group relative flex flex-col bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-200 hover:border-blue-500/50 cursor-pointer"
                  >
                    {/* Subject Badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-xs font-bold shadow-md bg-${squad.color}-500`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{squad.subject}</span>
                        <span className="opacity-80">({squad.subjectEn})</span>
                      </span>
                    </div>

                    {/* Image Area with Gradient */}
                    <div className="w-full aspect-[4/3] overflow-hidden relative">
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${squad.gradient} transform group-hover:scale-105 transition-transform duration-700`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                      
                      {/* Character Names */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-white text-2xl font-black tracking-tight drop-shadow-md">
                          {squad.name}
                        </h3>
                        <p className="text-white/90 text-sm font-medium">{squad.nameEn}</p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="mb-4">
                        <p className="text-slate-600 font-medium leading-relaxed">
                          {squad.description}
                        </p>
                      </div>
                      <div className="mt-auto">
                        <button className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl bg-slate-50 hover:bg-blue-600 text-slate-700 hover:text-white font-bold transition-all group-hover:bg-blue-600 group-hover:text-white border border-slate-200 hover:border-transparent">
                          <span>加入{squad.subject}小队</span>
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
