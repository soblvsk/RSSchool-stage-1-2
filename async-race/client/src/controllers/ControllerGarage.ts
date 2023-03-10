import Engine from '../api/Engine';
import Garage from '../api/Garage';
import Winners from '../api/Winners';
import { EngineCar, UpdateCar } from '../core/interfaces';
import { getRandomCars, getRandomName } from '../core/utils';
import store from '../core/store';
import garageControlsComponent from '../views/components/GarageControls/GarageControls';
import garagePaginationComponent from '../views/components/GaragePagination/GaragePagination';
import garageRacingComponent from '../views/components/GarageRacing/GarageRacing';
import ControllerWinners from './ControllerWinners';
import constants from '../core/constants';

class ControllerGarage {
  private garage: Garage;

  private winners: Winners;

  private winnersController: ControllerWinners;

  private engine: Engine;

  private animations: { [index: number]: number };

  private carRace: { [index: number]: boolean };

  constructor() {
    this.garage = new Garage();
    this.winners = new Winners();
    this.winnersController = new ControllerWinners();
    this.engine = new Engine();
    this.animations = {};
    this.carRace = {};
  }

  async start() {
    await this.loading();

    const garage = document.querySelector('.garage') as HTMLDivElement;
    garage.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.btn-edit')) this.editCar(target);
      if (target.closest('.btn-delete')) this.removeCar(target);
      if (target.closest('.btn-car-reset'))
        this.resetCar(Number(target.dataset.id)).catch((err) => {
          console.log(err);
        });
      if (target.closest('.btn-car-start'))
        this.startCar(Number(target.dataset.id)).catch((err) => {
          console.log(err);
        });
      if (target.closest('.btn-create')) this.createCar();
      if (target.closest('.btn-generate')) this.generateCars();
      if (target.closest('.btn-race-start')) this.startRace();
      if (target.closest('.btn-race-reset')) this.resetRace();
      if (target.closest('.btn-garage-prev')) this.pagination('prev');
      if (target.closest('.btn-garage-next')) this.pagination('next');
    });

    const modalOverlay = document.querySelector('.modal__overlay') as HTMLDivElement;
    modalOverlay.addEventListener('click', () => {
      this.closeModal();
      this.winnersController.loading();
    });
  }

  async loading() {
    const cars = await this.garage.getCars(store.garagePage);
    store.countPagesGarage = Math.ceil(Number(cars.totalCount) / constants.carsInPage);

    garageControlsComponent.render(cars.totalCount);
    garageRacingComponent.render(cars.items);
    garagePaginationComponent.render(store.garagePage, store.countPagesGarage);

    const btnPrev = document.querySelector('.btn-garage-prev') as HTMLButtonElement;
    if (store.garagePage === 1) btnPrev.disabled = true;
    else btnPrev.disabled = false;

    const btnNext = document.querySelector('.btn-garage-next') as HTMLButtonElement;
    if (Number(cars.totalCount) > store.countPagesGarage) btnNext.disabled = false;
    if (store.garagePage >= store.countPagesGarage) btnNext.disabled = true;
  }

  async removeCar(target: HTMLElement) {
    const carId = Number(target.dataset.id);
    await this.garage.deleteCar(carId);
    await this.winners.deleteWinner(carId);
    const cars = await this.garage.getCars(store.garagePage);

    if (!cars.items.length && store.garagePage !== 1) store.garagePage -= 1;

    await this.loading();
  }

  async updateCar(id: number, name: string, color: string) {
    await this.garage.updateCar(id, {
      name,
      color,
    });

    await this.loading();
  }

  async editCar(target: HTMLElement) {
    let updateBtn = document.querySelector('.btn-create') as HTMLButtonElement;
    const nameCreateCar = document.querySelector('.create__name-input') as HTMLInputElement;
    const colorCreateCar = document.querySelector('.create__color-input') as HTMLInputElement;

    const carId = Number(target.dataset.id);
    const carsData = await this.garage.getCars(store.garagePage);
    const car = carsData.items.find((element) => element.id === carId);

    if (!updateBtn) updateBtn = document.querySelector('.btn-update') as HTMLButtonElement;
    if (updateBtn.classList.contains('btn-create')) {
      updateBtn.classList.remove('btn-create');
      updateBtn.classList.add('btn-update');
      updateBtn.innerHTML = 'Update Car';
    }

    nameCreateCar.value = `${car ? car.name : ''}`;
    colorCreateCar.value = `${car ? car.color : '#000000'}`;

    updateBtn.addEventListener('click', () => {
      this.updateCar(carId, nameCreateCar.value, colorCreateCar.value);
    });
  }

  async createCar() {
    const nameCreateCar = document.querySelector('.create__name-input') as HTMLInputElement;
    const colorCreateCar = document.querySelector('.create__color-input') as HTMLInputElement;

    if (!nameCreateCar.value) nameCreateCar.value = getRandomName();

    await this.garage.createCar({
      name: nameCreateCar.value,
      color: colorCreateCar.value,
    });
    nameCreateCar.value = '';
    await this.loading();
  }

  async generateCars() {
    const generateBtn = document.querySelector('.btn-generate') as HTMLButtonElement;

    generateBtn.disabled = true;
    generateBtn.innerHTML = 'Generating';

    const cars = getRandomCars();
    await Promise.all(cars.map((element: UpdateCar) => this.garage.createCar(element)));

    generateBtn.disabled = false;
    generateBtn.innerHTML = 'Generate cars';

    await this.loading();
  }

  async pagination(btn: string) {
    const btnPrev = document.querySelector('.btn-garage-prev') as HTMLButtonElement;
    const btnNext = document.querySelector('.btn-garage-next') as HTMLButtonElement;

    if (btn === 'prev') {
      if (store.garagePage === 1) btnPrev.disabled = true;

      if (store.garagePage > 1) {
        store.garagePage -= 1;
        btnNext.disabled = false;
      }
      await this.loading();
    } else {
      if (store.garagePage === store.countPagesGarage) btnNext.disabled = true;

      if (store.garagePage < store.countPagesGarage) {
        store.garagePage += 1;
        btnPrev.disabled = false;
      }
      await this.loading();
    }
  }

  async animateCar(carId: number, raceCar: HTMLDivElement, duration: number, trackLength: number) {
    let start: number;
    const carItem = raceCar;

    const animation = (time: number) => {
      let progress = (time - start) / duration;
      if (progress > 1) progress = 1;

      const length = trackLength * progress;
      carItem.style.left = `${length}px`;

      if (progress < 1) {
        this.animations[carId] = requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame((time) => {
      start = time;
      animation(time);
    });

    const result = await this.engine.driveEngine(carId);

    if (result !== 200) {
      this.carRace[carId] = false;
      cancelAnimationFrame(this.animations[carId]);
      return false;
    }
    return true;
  }

  async startCar(carId: number) {
    const startBtn = document.querySelector(`.btn-car-start[data-id="${carId}"]`) as HTMLButtonElement;
    const stopBtn = document.querySelector(`.btn-car-reset[data-id="${carId}"]`) as HTMLButtonElement;
    const raceTrack = document.querySelector(`.car-racing__track[data-id="${carId}"]`) as HTMLDivElement;
    const raceCar = document.querySelector(`.car-racing__item[data-id="${carId}"]`) as HTMLDivElement;

    this.carRace[carId] = true;
    raceCar.style.left = '0px';
    startBtn.disabled = true;
    stopBtn.disabled = false;

    const lengthRoad = raceTrack.offsetWidth - raceCar.offsetWidth;
    const engineCar: EngineCar = await this.engine.startEngine(carId);
    const duration = engineCar.distance / engineCar.velocity;
    const result = await this.animateCar(carId, raceCar, duration, lengthRoad);

    if (result) return { carId, duration };
    return Promise.reject();
  }

  async startRace() {
    const startRaceBtn = document.querySelector('.btn-race-start') as HTMLButtonElement;
    const resetRaceBtn = document.querySelector('.btn-race-reset') as HTMLButtonElement;
    const modal = document.querySelector('.modal') as HTMLDivElement;

    startRaceBtn.disabled = true;
    resetRaceBtn.disabled = true;

    const carsData = await this.garage.getCars(store.garagePage);
    Promise.any(carsData.items.map((element) => this.startCar(element.id)))
      .then((result) => {
        if (this.carRace[result.carId] === true) {
          const carName = carsData.items.find((element) => element.id === result.carId);
          modal.classList.add('modal-open');
          this.openModal(Math.floor(result.duration) / 1000, carName ? carName.name : '');
          this.addWinner(result.carId, Math.floor(result.duration) / 1000);
        }
      })
      .catch(() => {
        console.log('All cars have broken');
      })
      .finally(() => {
        resetRaceBtn.disabled = false;
      });
  }

  openModal(duration: number, name: string) {
    document.body.style.overflow = 'hidden';
    const winCar = document.querySelector('.win-car') as HTMLDivElement;
    winCar.innerHTML = `${name} <br>Time: ${duration} sec`;
  }

  closeModal() {
    document.body.style.overflow = '';
    const modal = document.querySelector('.modal') as HTMLDivElement;
    modal.classList.remove('modal-open');
  }

  async addWinner(carId: number, timeCar: number) {
    const winners = await this.winners.getWinner(carId);
    if (winners.id === carId) {
      const newWin = Number(winners.wins) + 1;
      const newTime = timeCar < Number(winners.time) ? timeCar : Number(winners.time);
      await this.winners.updateWinner(carId, { time: newTime, wins: newWin });
    } else {
      await this.winners.createWinner({ id: carId, time: timeCar, wins: 1 });
    }
  }

  async resetCar(carId: number) {
    const startBtn = document.querySelector(`.btn-car-start[data-id="${carId}"]`) as HTMLButtonElement;
    const stopBtn = document.querySelector(`.btn-car-reset[data-id="${carId}"]`) as HTMLButtonElement;
    const raceCar = document.querySelector(`.car-racing__item[data-id="${carId}"]`) as HTMLDivElement;

    await this.engine.stopEngine(carId);
    this.carRace[carId] = false;

    stopBtn.disabled = true;
    startBtn.disabled = false;
    cancelAnimationFrame(this.animations[carId]);
    raceCar.style.left = '0px';
  }

  async resetRace() {
    const startRaceBtn = document.querySelector('.btn-race-start') as HTMLButtonElement;
    const resetRaceBtn = document.querySelector('.btn-race-reset') as HTMLButtonElement;
    resetRaceBtn.disabled = true;
    const carsData = await this.garage.getCars(store.garagePage);
    const carsDataPromise = carsData.items.map((element) => this.resetCar(element.id));
    Promise.all(carsDataPromise).finally(() => {
      startRaceBtn.disabled = false;
    });
  }
}

export default ControllerGarage;
