export type Pin = {
  id: string;
  title: string;
  image: string;
  width: number;
  height: number;
  url: string;
  board: string;
};

export type PinsResponse = {
  source: "pinterest" | "mock";
  boards: number;
  pins: Pin[];
};

