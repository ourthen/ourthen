export default function Home() {
  return (
    <div className="grainy-bg min-h-screen px-5 py-8 text-foreground md:px-9">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 pb-12">
        <header className="flex items-center justify-between rounded-full bg-white/75 px-5 py-3 shadow-sm backdrop-blur md:px-7">
          <p className="font-[var(--font-display)] text-xl font-bold tracking-tight">우리그때</p>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong">
            Closed Beta
          </span>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-6">
            <p className="floating-badge inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-bold text-white">
              약속 사이 기록, 이제 안 까먹어
            </p>
            <h1 className="max-w-xl font-[var(--font-display)] text-5xl leading-[1.04] font-bold tracking-tight md:text-6xl">
              우리그때
              <br />
              약속 사이를
              <br />
              퍼즐처럼 모으자.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-ink-soft">
              친구들과 올린 소식이 자동으로 조각이 되고, 약속에서 나온 이야기만 탭으로 체크한다.
              긴 회고 대신, 진짜 기억만 남는다.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-bold text-white transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                href="mailto:beta@ourthen.app?subject=%EC%9A%B0%EB%A6%AC%EA%B7%B8%EB%95%8C%20%EB%B2%A0%ED%83%80%20%EC%8B%A0%EC%B2%AD"
              >
                베타 신청하기
              </a>
              <a
                className="inline-flex h-12 items-center justify-center rounded-full border border-black/15 bg-white/70 px-6 text-sm font-semibold transition hover:bg-white"
                href="https://vercel.com/new"
                target="_blank"
                rel="noreferrer"
              >
                Vercel에 바로 배포 준비
              </a>
            </div>
          </div>

          <div className="rounded-4xl border border-black/10 bg-card p-6 shadow-md md:p-7">
            <h2 className="font-[var(--font-display)] text-2xl font-bold">오늘의 퍼즐 진행</h2>
            <ul className="mt-5 space-y-3 text-sm text-ink-soft">
              <li className="card-rise rounded-2xl bg-white px-4 py-3">
                <p className="font-semibold text-foreground">약속 1개 = 퍼즐 1개</p>
                <p>조각 1개만 연결해도 퍼즐 완성.</p>
              </li>
              <li className="card-rise rounded-2xl bg-white px-4 py-3">
                <p className="font-semibold text-foreground">mentioned 한 번 + 댓글</p>
                <p>덧붙인 내용은 댓글로 가볍게 기록.</p>
              </li>
              <li className="card-rise rounded-2xl bg-white px-4 py-3">
                <p className="font-semibold text-foreground">조각이 쌓일수록 진화</p>
                <p>같은 약속도 매번 다른 비주얼 테마로 완성.</p>
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-4xl border border-black/10 bg-white/80 p-6 shadow-sm md:p-8">
          <h3 className="font-[var(--font-display)] text-3xl font-bold tracking-tight">유저 플로우</h3>
          <ol className="mt-6 grid gap-4 md:grid-cols-4">
            <li className="rounded-2xl bg-card p-4">
              <p className="text-xs font-bold text-accent-strong">STEP 1</p>
              <p className="mt-2 font-semibold">소식 업로드</p>
              <p className="mt-1 text-sm text-ink-soft">텍스트, 사진, 링크를 가볍게 남긴다.</p>
            </li>
            <li className="rounded-2xl bg-card p-4">
              <p className="text-xs font-bold text-accent-strong">STEP 2</p>
              <p className="mt-2 font-semibold">조각 자동 생성</p>
              <p className="mt-1 text-sm text-ink-soft">업로드 즉시 퍼즐 조각이 쌓인다.</p>
            </li>
            <li className="rounded-2xl bg-card p-4">
              <p className="text-xs font-bold text-accent-strong">STEP 3</p>
              <p className="mt-2 font-semibold">약속에서 체크</p>
              <p className="mt-1 text-sm text-ink-soft">나온 얘기만 mentioned로 탭한다.</p>
            </li>
            <li className="rounded-2xl bg-card p-4">
              <p className="text-xs font-bold text-accent-strong">STEP 4</p>
              <p className="mt-2 font-semibold">퍼즐 진화</p>
              <p className="mt-1 text-sm text-ink-soft">조각 수와 다양성 점수로 비주얼 업.</p>
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
}
