import { writable } from 'svelte/store';

export interface ChatState {
  sending: boolean;
  streaming: boolean;
  animating: boolean;
}

const chatBusy : ChatState = $state<ChatState>({
  sending: false,
  streaming: false,
  animating: false,
});

export function getChatBusyState(){
  return   { ...chatBusy };
}

export function setChatSending(val : boolean){
  chatBusy.sending = val;
}

export function setChatStreaming(val:boolean){
  chatBusy.streaming = val;
}


export function setChatAnimating(val:boolean){
  chatBusy.animating = val;
}

export function isChatBusy(){
  return chatBusy.sending || chatBusy.streaming || chatBusy.animating
}
