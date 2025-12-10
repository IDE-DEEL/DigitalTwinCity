<template>
  <div class="flex items-center justify-between gap-4 px-6 py-2 border border-gray-400 rounded-md">
    <!-- Score + Time -->
    <div class="flex gap-4">
      <div class="flex items-center gap-2"><span>Score:</span><span>0</span></div>
      <div class="flex items-center gap-2"><span>Tijd:</span><span>00:00</span></div>
    </div>
    <!-- Start + Stop-->
    <div class="flex gap-2 p-8">
      <button class="bg-sky-200 hover:bg-sky-700 rounded-sm w-24 h-10">Start</button>
      <button class="bg-sky-200 hover:bg-sky-700 rounded-sm w-24 h-10">Stop</button>
    </div>
  </div>
</template>
