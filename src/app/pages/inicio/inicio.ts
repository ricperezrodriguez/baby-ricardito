import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottleCard } from '@app/pages/inicio/cards/bottle-card';
import { BreastfeedingCard } from '@app/pages/inicio/cards/breastfeeding-card/breastfeeding-card';
import { DiaperCard } from '@app/pages/inicio/cards/diaper-card';
import { SleepCard } from '@app/pages/inicio/cards/sleep-card';

@Component({
  imports: [BreastfeedingCard, BottleCard, DiaperCard, SleepCard, RouterOutlet],
  styleUrl: './inicio.scss',
  templateUrl: './inicio.html',
})
export class Inicio {}
