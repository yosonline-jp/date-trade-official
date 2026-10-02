'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from './ui/button';

type BackBtnProps = {
  link?: string;
  text?: string;
};

const BackBtn = ({ link, text = '戻る' }: BackBtnProps) => {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      className="flex w-fit flex-row items-center space-x-2 hover:bg-primary/20 hover:text-white"
      onClick={() => (link ? router.push(link) : router.back())}
    >
      <ArrowLeft className="h-6 w-6" />
      <p>{text}</p>
    </Button>
  );
};

export default BackBtn;
