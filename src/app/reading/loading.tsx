import LoadingOrb from '@/components/LoadingOrb';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
      <LoadingOrb label="Opening your chart" />
    </main>
  );
}
