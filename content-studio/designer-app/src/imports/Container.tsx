import svgPaths from "./svg-sxifsdxhhb";
import imgAvatar from "@/assets/placeholder-theme.svg";

function Palantir() {
  return (
    <div className="absolute inset-1/4 overflow-clip rounded-[999px] shadow-[0px_1px_3px_0px_rgba(10,13,18,0.1),0px_1px_2px_0px_rgba(10,13,18,0.06)]" data-name="Palantir" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 16 16\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'0.05000000074505806\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(-7.1653e-16 0.7 -0.7 -8.3703e-17 8 4.6)\\'><stop stop-color=\\'rgba(255,255,255,1)\\' offset=\\'0\\'/><stop stop-color=\\'rgba(255,255,255,0)\\' offset=\\'1\\'/></radialGradient></defs></svg>'), url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 16 16\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'0.18000000715255737\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(4.8986e-17 0.8 -0.8 4.8986e-17 8 8)\\'><stop stop-color=\\'rgba(255,255,255,0)\\' offset=\\'0.7466\\'/><stop stop-color=\\'rgba(255,255,255,1)\\' offset=\\'1\\'/></radialGradient></defs></svg>'), url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 16 16\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'0.07999999821186066\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(-3.8354e-16 1.2 -1.2 5.8242e-15 8 -3.908e-14)\\'><stop stop-color=\\'rgba(255,255,255,0)\\' offset=\\'0\\'/><stop stop-color=\\'rgba(255,255,255,0)\\' offset=\\'0.5\\'/><stop stop-color=\\'rgba(255,255,255,1)\\' offset=\\'0.99\\'/><stop stop-color=\\'rgba(255,255,255,0)\\' offset=\\'1\\'/></radialGradient></defs></svg>'), linear-gradient(26.565deg, rgb(83, 56, 158) 8.3333%, rgb(105, 65, 198) 91.667%)" }}>
      <div className="absolute h-[3.2px] left-[3.2px] top-[1.6px] w-[9.6px]" data-name="Reflection">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.6 3.2">
          <path d={svgPaths.p29911df0} fill="url(#paint0_linear_2018_4930)" fillOpacity="0.4" id="Reflection" />
          <defs>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_2018_4930" x1="4.8" x2="4.8" y1="0" y2="3.2">
              <stop stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function Blur() {
  return <div className="absolute backdrop-blur-[2.5px] bg-[rgba(255,255,255,0.2)] bottom-0 left-0 right-0 rounded-bl-[8px] rounded-br-[8px] top-1/2" data-name="Blur" />;
}

function Content1() {
  return (
    <div className="relative rounded-[8px] shrink-0 size-[32px]" data-name="Content" style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.2) 0%, rgba(10, 13, 18, 0.2) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)" }}>
      <div className="overflow-clip relative rounded-[inherit] size-full">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
          <g clipPath="url(#clip0_2018_4912)" id="Grid" opacity="0.14">
            <path clipRule="evenodd" d={svgPaths.p312a9a00} fill="var(--fill-0, #0A0D12)" fillRule="evenodd" id="Vector" />
          </g>
          <defs>
            <clipPath id="clip0_2018_4912">
              <rect fill="white" height="32" width="32" />
            </clipPath>
          </defs>
        </svg>
        <Palantir />
        <Blur />
      </div>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_-0.5px_0.5px_0px_rgba(10,13,18,0.1)]" />
      <div aria-hidden="true" className="absolute border-[0.2px] border-[rgba(10,13,18,0.12)] border-solid inset-0 pointer-events-none rounded-[8px] shadow-[0px_1px_1px_-0.5px_rgba(10,13,18,0.13),0px_1px_3px_0px_rgba(10,13,18,0.1),0px_1px_2px_0px_rgba(10,13,18,0.06)]" />
    </div>
  );
}

function Logotype() {
  return (
    <div className="absolute inset-[0_0_0_30.22%]" data-name="Logotype">
      <div className="absolute bottom-[27.46%] left-0 top-[23.82%] w-[96.673px]" data-name="Vector">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 96.6729 15.5895">
          <g id="Vector">
            <path d={svgPaths.p111ca700} fill="var(--fill-0, #181D27)" />
            <path d={svgPaths.p162dce00} fill="var(--fill-0, #181D27)" />
            <path d={svgPaths.p3e393580} fill="var(--fill-0, #181D27)" />
            <path d={svgPaths.p34609180} fill="var(--fill-0, #181D27)" />
            <path d={svgPaths.p162d4f00} fill="var(--fill-0, #181D27)" />
            <path clipRule="evenodd" d={svgPaths.pbce2df0} fill="var(--fill-0, #181D27)" fillRule="evenodd" />
            <path clipRule="evenodd" d={svgPaths.p9487500} fill="var(--fill-0, #181D27)" fillRule="evenodd" />
            <path d={svgPaths.p13eb7ec0} fill="var(--fill-0, #181D27)" />
            <path d={svgPaths.pfbe8980} fill="var(--fill-0, #181D27)" />
            <path d={svgPaths.p122e7480} fill="var(--fill-0, #181D27)" />
            <path d={svgPaths.p3dfebe00} fill="var(--fill-0, #181D27)" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function LogoWrap() {
  return (
    <div className="h-[32px] relative shrink-0 w-[139px]" data-name="Logo wrap">
      <div className="absolute content-stretch flex inset-[0_76.98%_0_0] items-start" data-name="Logomark">
        <Content1 />
      </div>
      <Logotype />
    </div>
  );
}

function TextAndIcon() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Text and icon">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[18px] not-italic relative shrink-0 text-[#414651] text-[12px] whitespace-nowrap">Home</p>
    </div>
  );
}

function Content2() {
  return (
    <div className="bg-white content-stretch flex gap-[12px] items-center px-[12px] py-[8px] relative rounded-[6px] shrink-0" data-name="Content">
      <TextAndIcon />
    </div>
  );
}

function TextAndIcon1() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Text and icon">
      <p className="font-['Inter:Semibold',sans-serif] leading-[18px] not-italic relative shrink-0 text-[#252b37] text-[12px] whitespace-nowrap">Dashboard</p>
    </div>
  );
}

function Content3() {
  return (
    <div className="content-stretch flex gap-[12px] items-center px-[12px] py-[8px] relative rounded-[6px] shrink-0" data-name="Content" style={{ backgroundImage: "linear-gradient(171.497deg, rgba(255, 117, 0, 0.2) 12.826%, rgba(255, 59, 162, 0.2) 84.859%)" }}>
      <TextAndIcon1 />
    </div>
  );
}

function TextAndIcon2() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Text and icon">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[18px] not-italic relative shrink-0 text-[#414651] text-[12px] whitespace-nowrap">Projects</p>
    </div>
  );
}

function Content4() {
  return (
    <div className="bg-white content-stretch flex gap-[12px] items-center px-[12px] py-[8px] relative rounded-[6px] shrink-0" data-name="Content">
      <TextAndIcon2 />
    </div>
  );
}

function TextAndIcon3() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Text and icon">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[18px] not-italic relative shrink-0 text-[#414651] text-[12px] whitespace-nowrap">Tasks</p>
    </div>
  );
}

function Content5() {
  return (
    <div className="bg-white content-stretch flex gap-[12px] items-center px-[12px] py-[8px] relative rounded-[6px] shrink-0" data-name="Content">
      <TextAndIcon3 />
    </div>
  );
}

function TextAndIcon4() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Text and icon">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[18px] not-italic relative shrink-0 text-[#414651] text-[12px] whitespace-nowrap">Reporting</p>
    </div>
  );
}

function Content6() {
  return (
    <div className="bg-white content-stretch flex gap-[12px] items-center px-[12px] py-[8px] relative rounded-[6px] shrink-0" data-name="Content">
      <TextAndIcon4 />
    </div>
  );
}

function TextAndIcon5() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Text and icon">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[18px] not-italic relative shrink-0 text-[#414651] text-[12px] whitespace-nowrap">Users</p>
    </div>
  );
}

function Content7() {
  return (
    <div className="bg-white content-stretch flex gap-[12px] items-center px-[12px] py-[8px] relative rounded-[6px] shrink-0" data-name="Content">
      <TextAndIcon5 />
    </div>
  );
}

function Navigation() {
  return (
    <div className="content-stretch flex gap-[2px] items-center relative shrink-0" data-name="Navigation">
      <div className="content-stretch flex items-center overflow-clip py-[2px] relative shrink-0" data-name="_Nav item base">
        <Content2 />
      </div>
      <div className="content-stretch flex items-center overflow-clip py-[2px] relative shrink-0" data-name="_Nav item base">
        <Content3 />
      </div>
      <div className="content-stretch flex items-center overflow-clip py-[2px] relative shrink-0" data-name="_Nav item base">
        <Content4 />
      </div>
      <div className="content-stretch flex items-center overflow-clip py-[2px] relative shrink-0" data-name="_Nav item base">
        <Content5 />
      </div>
      <div className="content-stretch flex items-center overflow-clip py-[2px] relative shrink-0" data-name="_Nav item base">
        <Content6 />
      </div>
      <div className="content-stretch flex items-center overflow-clip py-[2px] relative shrink-0" data-name="_Nav item base">
        <Content7 />
      </div>
    </div>
  );
}

function Content() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="Content">
      <div className="content-stretch flex items-start relative shrink-0 w-[139px]" data-name="Logo">
        <LogoWrap />
      </div>
      <Navigation />
    </div>
  );
}

function Actions() {
  return (
    <div className="content-stretch flex gap-[2px] items-start relative shrink-0" data-name="Actions">
      <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative rounded-[6px] shrink-0 w-[40px]" data-name="_Nav item button">
        <div className="overflow-clip relative shrink-0 size-[20px]" data-name="settings-01">
          <div className="absolute inset-[8.33%]" data-name="Icon">
            <div className="absolute inset-[-5%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18.3333 18.3333">
                <g id="Icon">
                  <path d={svgPaths.p32a34900} stroke="var(--stroke-0, #A4A7AE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  <path d={svgPaths.p1d320d00} stroke="var(--stroke-0, #A4A7AE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative rounded-[6px] shrink-0 w-[40px]" data-name="_Nav item button">
        <div className="overflow-clip relative shrink-0 size-[20px]" data-name="bell-01">
          <div className="absolute inset-[8.33%_13.59%]" data-name="Icon">
            <div className="absolute inset-[-5%_-5.72%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.2317 18.3333">
                <path d={svgPaths.p232d0100} id="Icon" stroke="var(--stroke-0, #A4A7AE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Content8() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Content">
      <Actions />
      <button className="content-stretch cursor-pointer flex flex-col items-start relative shrink-0" data-name="Dropdown">
        <div className="pointer-events-none relative rounded-[9999px] shrink-0 size-[40px]" data-name="Avatar">
          <img alt="" className="absolute inset-0 max-w-none object-cover rounded-[9999px] size-full" src={imgAvatar} />
          <div aria-hidden="true" className="absolute border border-[rgba(0,0,0,0.08)] border-solid inset-0 rounded-[9999px]" />
        </div>
      </button>
    </div>
  );
}

export default function Container() {
  return (
    <div className="content-stretch flex items-center justify-between px-[32px] relative size-full" data-name="Container">
      <Content />
      <Content8 />
    </div>
  );
}